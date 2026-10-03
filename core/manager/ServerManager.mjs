/**
 * Kyrnex Core - ServerManager
 * Orchestrates multi-server lifecycle, state persistence, metrics, and Electron preview captures
 *
 * @module ServerManager
 */

import path from "path";
import fs from "fs";
import { EventEmitter } from "events";
import { dyn } from "dynexpress";
import { logger } from "../logger/Logger.mjs";
import { KyrnexError } from "../error/KyrnexError.mjs";
import { ErrorCodes } from "../error/ErrorCodes.mjs";

export class ServerManager extends EventEmitter {
  #configPath;
  #cacheDir;
  #servers = new Map();
  #metricsInterval = null;
  #capturePageHandler = null;

  constructor(options = {}) {
    super();
    let rootDir = process.cwd();
    const isPackaged = process.execPath && !process.execPath.toLowerCase().includes("electron.exe");
    if (isPackaged) {
      const exeDir = path.dirname(process.execPath);
      const isInstalled =
        fs.existsSync(path.join(exeDir, "Uninstall Kyrnex.exe")) ||
        exeDir.toLowerCase().includes(path.join("appdata", "local", "programs").toLowerCase()) ||
        exeDir.toLowerCase().includes("program files");
      const hasPortableFlag = fs.existsSync(path.join(exeDir, ".portable"));

      if (hasPortableFlag || !isInstalled) {
        rootDir = exeDir;
      } else {
        const appData = process.env.APPDATA || process.env.USERPROFILE || exeDir;
        rootDir = path.join(appData, "Kyrnex");
      }
    }

    this.dataDir = options.dataDir || path.join(rootDir, "data");
    this.#configPath = path.join(this.dataDir, "servers.json");
    this.#cacheDir = path.join(this.dataDir, "previews");

    this.#initDirectories();
    this.#loadServers();
    this.#setupDynListeners();
    this.#startMetricsLoop();
  }

  /**
   * Set callback for native offscreen screenshot capture via Electron
   */
  setCapturePageHandler(handler) {
    this.#capturePageHandler = handler;
  }

  #initDirectories() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    if (!fs.existsSync(this.#cacheDir)) {
      fs.mkdirSync(this.#cacheDir, { recursive: true });
    }
  }

  #loadServers() {
    if (fs.existsSync(this.#configPath)) {
      try {
        let raw = fs.readFileSync(this.#configPath, "utf8");
        if (raw.charCodeAt(0) === 0xfeff) {
          raw = raw.slice(1);
        }
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          for (const item of list) {
            this.#servers.set(item.id, {
              ...item,
              viewsDir: item.viewsDir !== undefined ? item.viewsDir : "views",
              status: "stopped",
              connections: 0,
              cpu: 0,
              memoryMb: 0,
              previewImage: this.#getPreviewPath(item.id),
            });
          }
          return;
        }
      } catch (err) {
        logger?.error("ServerManager", "Error al cargar servers.json", err);
      }
    }

    // Clean initial state: start empty without dummy servers
    this.#saveServers();
  }

  #saveServers() {
    try {
      const dataToSave = Array.from(this.#servers.values()).map((s) => ({
        id: s.id,
        name: s.name,
        port: s.port,
        rootDir: s.rootDir,
        publicDir: s.publicDir,
        viewsDir: s.viewsDir !== undefined ? s.viewsDir : "views",
        mainFile: s.mainFile,
        autoStart: s.autoStart,
        type: s.type || "static",
      }));
      fs.writeFileSync(this.#configPath, JSON.stringify(dataToSave, null, 2), "utf8");
    } catch (err) {
      logger?.error("ServerManager", "Error al guardar servers.json", err);
    }
  }

  #getPreviewPath(serverId) {
    const filePath = path.join(this.#cacheDir, `${serverId}.png`);
    return fs.existsSync(filePath) ? filePath : null;
  }

  #setStatus(id, status, extra = {}) {
    const srv = this.#servers.get(id);
    if (!srv) return;

    const statusChanged = srv.status !== status;
    const portChanged = extra.port !== undefined && srv.port !== extra.port;
    const urlChanged = extra.url !== undefined && srv.url !== extra.url;

    if (!statusChanged && !portChanged && !urlChanged) {
      return;
    }

    srv.status = status;
    if (extra.port !== undefined) srv.port = extra.port;
    if (extra.url !== undefined) srv.url = extra.url;
    if (extra.error !== undefined) srv.lastError = extra.error;

    this.emit("serverStatusChanged", {
      id,
      status,
      port: srv.port,
      url: srv.url,
      ...extra,
    });
  }

  #setupDynListeners() {
    dyn.on("serverStarted", ({ name, port, url }) => {
      for (const [id, srv] of this.#servers.entries()) {
        if (srv.name === name) {
          logger?.success("ServerManager", `Servidor '${name}' está activo en ${url}`);
          this.#setStatus(id, "running", { port, url });
          break;
        }
      }
    });

    dyn.on("serverStopped", ({ name, port }) => {
      for (const [id, srv] of this.#servers.entries()) {
        if (srv.name === name) {
          logger?.info("ServerManager", `Servidor '${name}' se ha detenido`);
          this.#setStatus(id, "stopped", { port });
          break;
        }
      }
    });

    dyn.on("serverError", ({ name, error }) => {
      for (const [id, srv] of this.#servers.entries()) {
        if (srv.name === name) {
          logger?.error("ServerManager", `Error en servidor '${name}'`, error);
          this.#setStatus(id, "error", { error: error.message });
          break;
        }
      }
    });
  }

  #startMetricsLoop() {
    // Collect process metrics every 2.5 seconds
    this.#metricsInterval = setInterval(() => {
      const mem = process.memoryUsage();
      const cpu = process.cpuUsage();
      const memMb = Math.round((mem.rss / (1024 * 1024)) * 10) / 10;
      const cpuPercent = Math.min(100, Math.round(((cpu.user + cpu.system) / 1000000) * 10) / 100);

      for (const [id, srv] of this.#servers.entries()) {
        if (srv.status === "running") {
          const stats = dyn.getServerStats(srv.name);
          const liveConnections = stats?.activeSockets ?? 0;
          srv.connections = liveConnections;
          srv.memoryMb = memMb;
          srv.cpu = Math.max(0.1, cpuPercent);
          this.emit("serverMetrics", {
            id,
            connections: liveConnections,
            memoryMb: srv.memoryMb,
            cpu: srv.cpu,
            requestsTotal: stats?.requestsTotal ?? 0,
          });
        }
      }
    }, 2000);
  }

  /**
   * Get all servers with their current states
   */
  getAllServers() {
    return Array.from(this.#servers.values()).map((s) => ({
      ...s,
      url: s.status === "running" ? `http://localhost:${s.port}` : `http://localhost:${s.port}`,
    }));
  }

  /**
   * Get a specific server
   */
  getServer(id) {
    const srv = this.#servers.get(id);
    if (!srv) {
      throw new KyrnexError(ErrorCodes.E_SERVER_NOT_FOUND, `Servidor con ID '${id}' no encontrado`);
    }
    return { ...srv };
  }

  /**
   * Create a new server
   */
  async createServer(config) {
    const id = `srv-${Date.now().toString(36)}`;
    const port = parseInt(config.port, 10) || 3000;

    const newServer = {
      id,
      name: config.name || "Nuevo Servidor",
      port,
      rootDir: config.rootDir ? String(config.rootDir).trim() : process.cwd(),
      publicDir: config.publicDir !== undefined ? String(config.publicDir).trim() : "",
      viewsDir: config.viewsDir !== undefined ? String(config.viewsDir).trim() : "views",
      mainFile: config.mainFile ? String(config.mainFile).trim() : "index.html",
      autoStart: Boolean(config.autoStart),
      type: config.type || "static",
      status: "stopped",
      connections: 0,
      cpu: 0,
      memoryMb: 0,
      previewImage: null,
    };

    this.#servers.set(id, newServer);
    this.#saveServers();
    this.emit("serverCreated", newServer);
    logger?.info("ServerManager", `Servidor '${newServer.name}' creado exitosamente`);

    if (newServer.autoStart) {
      await this.startServer(id);
    }

    return newServer;
  }

  /**
   * Update server configuration
   */
  async updateServer(id, updates) {
    const srv = this.#servers.get(id);
    if (!srv) {
      throw new KyrnexError(ErrorCodes.E_SERVER_NOT_FOUND, `Servidor no encontrado`);
    }

    const wasRunning = srv.status === "running";
    if (wasRunning) {
      await this.stopServer(id);
    }

    if (updates.name !== undefined) srv.name = updates.name;
    if (updates.port !== undefined) srv.port = parseInt(updates.port, 10);
    if (updates.rootDir !== undefined) srv.rootDir = updates.rootDir;
    if (updates.publicDir !== undefined) srv.publicDir = updates.publicDir;
    if (updates.viewsDir !== undefined) srv.viewsDir = String(updates.viewsDir).trim();
    if (updates.mainFile !== undefined) srv.mainFile = updates.mainFile;
    if (updates.autoStart !== undefined) srv.autoStart = Boolean(updates.autoStart);
    if (updates.type !== undefined) srv.type = updates.type;

    this.#saveServers();
    this.emit("serverUpdated", srv);
    logger?.info("ServerManager", `Configuración de '${srv.name}' actualizada`);

    if (wasRunning || updates.status === "running") {
      await this.startServer(id);
    }

    return { ...srv };
  }

  /**
   * Delete a server
   */
  async deleteServer(id) {
    const srv = this.#servers.get(id);
    if (!srv) return false;

    if (srv.status === "running") {
      await this.stopServer(id);
    }

    this.#servers.delete(id);
    this.#saveServers();

    // Clean preview image
    const previewFile = path.join(this.#cacheDir, `${id}.png`);
    if (fs.existsSync(previewFile)) {
      try {
        fs.unlinkSync(previewFile);
      } catch {}
    }

    this.emit("serverDeleted", { id });
    logger?.info("ServerManager", `Servidor '${srv.name}' eliminado`);
    return true;
  }

  /**
   * Start a server via DynExpress
   */
  async startServer(id) {
    const srv = this.#servers.get(id);
    if (!srv) {
      throw new KyrnexError(ErrorCodes.E_SERVER_NOT_FOUND, `Servidor no encontrado`);
    }

    if (srv.status === "running") {
      return `http://localhost:${srv.port}/`;
    }

    logger?.info("ServerManager", `Iniciando '${srv.name}' en puerto ${srv.port}...`);

    let routers = [];
    const fullMainPath = path.join(srv.rootDir, srv.mainFile);

    // Only treat as dynamic backend router if server type is explicitly 'router'
    if (srv.type === "router" && fs.existsSync(fullMainPath) && (srv.mainFile.endsWith(".js") || srv.mainFile.endsWith(".mjs"))) {
      routers = fullMainPath;
    } else {
      // Default router to serve public static files or fallback index.html
      routers = [
        {
          method: "get",
          path: "*",
          handler: (req, res, next) => {
            const publicPath = srv.publicDir ? path.join(srv.rootDir, srv.publicDir) : srv.rootDir;
            const viewsPath = srv.viewsDir ? path.join(srv.rootDir, srv.viewsDir) : srv.rootDir;
            const targetPath = req.path === "/" ? srv.mainFile : req.path.replace(/^\//, "");

            // 1. Handle explicit EJS template request or mainFile is .ejs
            if (targetPath.endsWith(".ejs") || (req.path === "/" && srv.mainFile.endsWith(".ejs"))) {
              const viewName = targetPath.endsWith(".ejs")
                ? targetPath.replace(/\.ejs$/, "")
                : srv.mainFile.replace(/\.ejs$/, "");
              return res.render(viewName, {
                server: srv,
                title: srv.name,
                url: req.url,
              });
            }

            // 2. Check static file in publicPath
            const filePath = path.join(publicPath, targetPath);
            if (fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory()) {
              return res.sendFile(filePath);
            }

            // 3. Fallback: Check root directory in case publicDir was left as 'public' but files are in root
            if (srv.publicDir) {
              const rootFilePath = path.join(srv.rootDir, targetPath);
              if (fs.existsSync(rootFilePath) && !fs.statSync(rootFilePath).isDirectory()) {
                return res.sendFile(rootFilePath);
              }
            }

            // 4. Check mainFile in publicPath
            const indexPath = path.join(publicPath, srv.mainFile);
            if (fs.existsSync(indexPath)) {
              return res.sendFile(indexPath);
            }

            // 5. Check mainFile in rootDir
            const rootIndexPath = path.join(srv.rootDir, srv.mainFile);
            if (fs.existsSync(rootIndexPath)) {
              return res.sendFile(rootIndexPath);
            }

            // 6. Check if index.ejs exists in viewsPath or rootDir
            const viewIndexPath = path.join(viewsPath, "index.ejs");
            if (fs.existsSync(viewIndexPath)) {
              return res.render("index", { server: srv, title: srv.name });
            }
            const rootEjsPath = path.join(srv.rootDir, "index.ejs");
            if (fs.existsSync(rootEjsPath)) {
              return res.render("index", { server: srv, title: srv.name });
            }

            res.status(200).send(`
              <html>
                <body style="font-family: sans-serif; background: #0f172a; color: #fff; padding: 40px; text-align: center;">
                  <h2>${srv.name} (Kyrnex Local Runtime)</h2>
                  <p>Servidor activo en el puerto ${srv.port}</p>
                  <p style="color: #64748b;">Directorio raíz: ${srv.rootDir}</p>
                </body>
              </html>
            `);
          },
        },
      ];
    }

    const publicPath = srv.publicDir ? path.join(srv.rootDir, srv.publicDir) : srv.rootDir;
    const viewsPath = srv.viewsDir ? path.join(srv.rootDir, srv.viewsDir) : srv.rootDir;

    try {
      const url = await dyn.newServer({
        name: srv.name,
        port: srv.port,
        routers,
        appDir: srv.rootDir,
        pathPublic: publicPath,
        pathViews: viewsPath,
        autoPortFallback: true,
      });

      // Extract assigned port if fallback occurred
      let assignedPort = srv.port;
      const portMatch = url.match(/:(\d+)\//);
      if (portMatch) {
        assignedPort = parseInt(portMatch[1], 10);
      }

      this.#setStatus(srv.id, "running", { port: assignedPort, url });
      return url;
    } catch (err) {
      this.#setStatus(srv.id, "error", { error: err.message });
      throw err;
    }
  }

  /**
   * Stop a server via DynExpress
   */
  async stopServer(id) {
    const srv = this.#servers.get(id);
    if (!srv) {
      throw new KyrnexError(ErrorCodes.E_SERVER_NOT_FOUND, `Servidor no encontrado`);
    }

    if (srv.status !== "running") {
      return true;
    }

    try {
      await dyn.stopServer(srv.name);
      this.#setStatus(srv.id, "stopped", { port: srv.port });
      return true;
    } catch (err) {
      logger?.error("ServerManager", `Error al detener '${srv.name}'`, err);
      this.#setStatus(srv.id, "stopped", { port: srv.port });
      return false;
    }
  }

  /**
   * Restart a server
   */
  async restartServer(id) {
    await this.stopServer(id);
    return this.startServer(id);
  }

  /**
   * Capture preview screenshot natively using Electron offscreen capturePage
   */
  async capturePreview(id) {
    const srv = this.#servers.get(id);
    if (!srv) {
      throw new KyrnexError(ErrorCodes.E_SERVER_NOT_FOUND, `Servidor no encontrado`);
    }

    if (srv.status !== "running") {
      throw new Error("El servidor debe estar activo para capturar la vista previa");
    }

    if (!this.#capturePageHandler) {
      throw new Error("El capturador nativo de Electron no está configurado");
    }

    const url = `http://localhost:${srv.port}/`;
    logger?.info("ServerManager", `Capturando vista previa para '${srv.name}' (${url})...`);

    try {
      const imageBuffer = await this.#capturePageHandler(url);
      const previewFilePath = path.join(this.#cacheDir, `${id}.png`);
      fs.writeFileSync(previewFilePath, imageBuffer);
      srv.previewImage = previewFilePath;

      const base64Data = `data:image/png;base64,${imageBuffer.toString("base64")}`;
      logger?.success("ServerManager", `Vista previa actualizada con éxito para '${srv.name}'`);
      this.emit("previewUpdated", { id, previewUrl: base64Data });

      return base64Data;
    } catch (err) {
      logger?.error("ServerManager", `Error al capturar vista previa de '${srv.name}'`, err);
      throw err;
    }
  }

  /**
   * Get cached preview base64 or fallback
   */
  getCachedPreview(id) {
    const previewFile = path.join(this.#cacheDir, `${id}.png`);
    if (fs.existsSync(previewFile)) {
      const buffer = fs.readFileSync(previewFile);
      return `data:image/png;base64,${buffer.toString("base64")}`;
    }
    return null;
  }

  async cleanup() {
    if (this.#metricsInterval) {
      clearInterval(this.#metricsInterval);
      this.#metricsInterval = null;
    }
    try {
      await dyn.stopAll();
    } catch (err) {
      logger?.error("ServerManager", "Error al detener servidores en cleanup", err);
    }
  }
}

export const serverManager = new ServerManager();
export default serverManager;
