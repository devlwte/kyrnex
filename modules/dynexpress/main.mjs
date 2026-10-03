/**
 * DynExpress v2.0 - Next Generation Dynamic Express Server Engine
 * Enhanced for Kyrnex Platform with full backward compatibility.
 * Provides hot-reloading, telemetry metrics, socket tracking, route builders,
 * graceful port rebinds, dynamic middleware injection, and robust error boundaries.
 *
 * @module DynExpress
 * @author KyrnForge
 * @license MIT
 */

import path from "path";
import fs from "fs";
import express from "express";
import { createServer } from "net";
import EventEmitter from "events";
import Dynreload from "./utils/dynreload.mjs";
import { logger } from "./utils/logger.mjs";
import { DynExpressError, KyrnexError, ErrorCodes } from "./utils/errors.mjs";

/**
 * Fluent route builder for clean modular endpoint definition
 */
export class RouteBuilder {
  constructor(basePrefix = "") {
    this.prefix = basePrefix.replace(/\/+$/, "");
    this.routes = [];
  }

  #add(method, routePath, handlers) {
    const cleanPath = routePath.startsWith("/") ? routePath : `/${routePath}`;
    const fullPath = `${this.prefix}${cleanPath}` || "/";
    const handler = handlers.pop();
    const middleware = handlers.length === 1 ? handlers[0] : (handlers.length > 1 ? handlers : null);
    this.routes.push({ method: method.toLowerCase(), path: fullPath, middleware, handler });
    return this;
  }

  get(path, ...handlers) { return this.#add("get", path, handlers); }
  post(path, ...handlers) { return this.#add("post", path, handlers); }
  put(path, ...handlers) { return this.#add("put", path, handlers); }
  delete(path, ...handlers) { return this.#add("delete", path, handlers); }
  patch(path, ...handlers) { return this.#add("patch", path, handlers); }
  options(path, ...handlers) { return this.#add("options", path, handlers); }
  head(path, ...handlers) { return this.#add("head", path, handlers); }
  all(path, ...handlers) { return this.#add("all", path, handlers); }

  build() {
    return [...this.routes];
  }
}

/**
 * Enhanced Express server manager with dynamic reloading capabilities and event emission
 */
export class DynExpress extends EventEmitter {
  /** @private {Map<string, Object>} Map of running server instances */
  #instances = new Map();

  /** @private {Dynreload} Dynamic module reloader */
  #dynreload;

  /** @private {string} Default views directory */
  #defaultViewsPath;

  /** @private {string} Default public directory */
  #defaultPublicPath;

  /**
   * Creates a new DynExpress instance
   * @param {Object} [options] - Configuration options
   * @param {boolean} [options.silent=true] - Suppress console output
   * @param {number} [options.maxDepth=3] - Maximum recursion depth for file watching
   * @param {string} [options.viewsPath] - Custom default views directory
   * @param {string} [options.publicPath] - Custom default public directory
   */
  constructor(options = {}) {
    super();

    this.#dynreload = new Dynreload({
      silent: options.silent ?? true,
      maxDepth: options.maxDepth ?? 3,
    });

    const rootDir = process.cwd();
    this.#defaultViewsPath = options.viewsPath || path.join(rootDir, "bin", "views");
    this.#defaultPublicPath = options.publicPath || path.join(rootDir, "bin", "public");

    this.#registerShutdownHandlers();
  }

  /**
   * Register process signal handlers for graceful shutdown
   * @private
   */
  #registerShutdownHandlers() {
    const signals = ["SIGINT", "SIGTERM", "SIGHUP"];
    signals.forEach((signal) => {
      process.on(signal, async () => {
        try {
          await this.cleanup();
        } catch (error) {
          logger?.error("DynExpress", "Error during graceful shutdown", error);
        }
      });
    });
  }

  /**
   * Creates a new fluent route builder
   * @param {string} [prefix=""] - Base prefix path
   * @returns {RouteBuilder}
   */
  createRouter(prefix = "") {
    return new RouteBuilder(prefix);
  }

  /**
   * Alias for createRouter
   * @param {string} [prefix=""]
   * @returns {RouteBuilder}
   */
  router(prefix = "") {
    return this.createRouter(prefix);
  }

  /**
   * Validates router configuration
   * Supports arrays of routes, RouteBuilder instances, or file paths
   * @private
   * @param {Array|string|RouteBuilder} routers
   * @returns {Object} Validated router information
   */
  #validateRouters(routers) {
    if (routers instanceof RouteBuilder) {
      return { type: "array", value: routers.build() };
    }

    if (Array.isArray(routers)) {
      if (
        !routers.every(
          (route) =>
            route &&
            typeof route === "object" &&
            typeof route.method === "string" &&
            typeof route.path === "string" &&
            typeof route.handler === "function"
        )
      ) {
        throw new KyrnexError(
          ErrorCodes.E_MANIFEST_INVALID,
          "Cada ruta debe tener las propiedades 'method', 'path' y 'handler'"
        );
      }
      return { type: "array", value: routers };
    }

    if (typeof routers === "string") {
      const ext = path.extname(routers);
      if (ext !== ".js" && ext !== ".mjs") {
        throw new KyrnexError(
          ErrorCodes.E_MANIFEST_INVALID,
          "El archivo router debe tener extensión .js o .mjs"
        );
      }

      if (!fs.existsSync(routers)) {
        throw new KyrnexError(
          ErrorCodes.E_APP_NOT_FOUND,
          `Archivo router no encontrado en la ruta: ${routers}`
        );
      }

      return { type: "file", value: routers };
    }

    throw new KyrnexError(
      ErrorCodes.E_MANIFEST_INVALID,
      "Routers debe ser un array de rutas, una instancia de RouteBuilder o un archivo (.js/.mjs)"
    );
  }

  /**
   * Configure Express middleware and settings with enhanced safety
   * @private
   */
  #setupMiddleware(app, { appDir, pathViews, pathPublic, cors = false, stats = null, dynamicMiddlewares = [] }) {
    // Request tracking middleware for telemetry
    if (stats) {
      app.use((req, res, next) => {
        stats.requestsTotal++;
        const startTime = Date.now();
        const originalEnd = res.end;

        res.end = function (...args) {
          const duration = Date.now() - startTime;
          const code = res.statusCode;
          stats.statusCodes[code] = (stats.statusCodes[code] || 0) + 1;

          if (code >= 200 && code < 300) stats.requests2xx++;
          else if (code >= 400 && code < 500) stats.requests4xx++;
          else if (code >= 500) stats.requests5xx++;

          stats.lastResponseTimeMs = duration;
          return originalEnd.apply(this, args);
        };
        next();
      });
    }

    // Dynamic middleware runner (allows middleware injected via dyn.use() to run before routes)
    app.use((req, res, next) => {
      if (!dynamicMiddlewares || dynamicMiddlewares.length === 0) return next();
      let index = 0;
      const runNext = (err) => {
        if (err) return next(err);
        if (index >= dynamicMiddlewares.length) return next();
        const entry = dynamicMiddlewares[index++];
        try {
          if (entry.path) {
            if (req.path.startsWith(entry.path)) {
              entry.fn(req, res, runNext);
            } else {
              runNext();
            }
          } else {
            entry.fn(req, res, runNext);
          }
        } catch (mwErr) {
          next(mwErr);
        }
      };
      runNext();
    });

    // Built-in CORS option
    if (cors) {
      const origin = typeof cors === "string" ? cors : "*";
      app.use((req, res, next) => {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept");
        res.setHeader("Access-Control-Allow-Credentials", "true");
        if (req.method === "OPTIONS") {
          return res.sendStatus(204);
        }
        next();
      });
    }

    // Body parsers with safe JSON error catching
    app.use(express.urlencoded({ extended: true, limit: "100mb" }));
    app.use(express.json({ limit: "100mb" }));
    app.use((err, req, res, next) => {
      if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
        return res.status(400).json({ error: "Cuerpo de solicitud JSON malformado", status: 400 });
      }
      next(err);
    });

    // View engine setup
    app.set("view engine", "ejs");
    let resolvedViews = this.#defaultViewsPath;
    if (pathViews) {
      resolvedViews = appDir ? path.resolve(appDir, pathViews) : path.resolve(pathViews);
    }
    app.set("views", resolvedViews);

    // Static file directories
    const rawPublicDirs = Array.isArray(pathPublic)
      ? pathPublic
      : [pathPublic || this.#defaultPublicPath];

    rawPublicDirs.forEach((dir) => {
      if (typeof dir === "string") {
        const resolvedPublic = appDir ? path.resolve(appDir, dir) : path.resolve(dir);
        if (fs.existsSync(resolvedPublic)) {
          app.use(express.static(resolvedPublic));
        }
      }
    });

    // Standard Security headers
    app.use((req, res, next) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("X-Frame-Options", "SAMEORIGIN");
      res.setHeader("X-XSS-Protection", "1; mode=block");
      next();
    });
  }

  /**
   * Register routes with the Express application
   * @private
   */
  #setupRoutes(app, routes) {
    if (!Array.isArray(routes)) {
      throw new TypeError("Routes must be an array");
    }

    routes.forEach(({ method, path: routePath, middleware, handler }) => {
      if (!method || !routePath || !handler) {
        throw new Error(
          `Configuración de ruta inválida: ${JSON.stringify({ method, path: routePath })}`
        );
      }

      const methodLower = method.toLowerCase();
      if (typeof app[methodLower] !== "function") {
        throw new Error(`Método HTTP no soportado: ${method}`);
      }

      if (Array.isArray(middleware)) {
        app[methodLower](routePath, ...middleware, handler);
      } else if (middleware && typeof middleware === "function") {
        app[methodLower](routePath, middleware, handler);
      } else {
        app[methodLower](routePath, handler);
      }
    });

    // Universal error boundary middleware at the end of the stack
    app.use((err, req, res, next) => {
      logger?.error("DynExpress", `Error no controlado en ruta ${req.path}`, err);
      if (res.headersSent) {
        return next(err);
      }
      res.status(500).json({
        error: "Error interno del servidor",
        message: err.message || "Ocurrió un error inesperado al procesar la solicitud",
        status: 500,
        path: req.path,
      });
    });
  }

  /**
   * Check if a port is available
   * @param {number} port - Port to check
   * @returns {Promise<boolean>} True if port is available
   */
  async isPortAvailable(port) {
    return new Promise((resolve) => {
      const server = createServer()
        .once("error", () => resolve(false))
        .once("listening", () => {
          server.close(() => resolve(true));
        })
        .listen(port);
    });
  }

  /**
   * Find an available port starting from the provided base port
   * @private
   */
  async #findAvailablePort(startPort, maxAttempts = 20, allowFallback = true) {
    const basePort = parseInt(startPort, 10);
    if (isNaN(basePort) || basePort < 1024 || basePort > 65535) {
      throw new KyrnexError(
        ErrorCodes.E_PORT_INVALID,
        `El puerto '${startPort}' debe ser un número entero entre 1024 y 65535.`
      );
    }

    const isBaseAvailable = await this.isPortAvailable(basePort);
    if (isBaseAvailable) {
      return basePort;
    }

    if (!allowFallback) {
      throw new KyrnexError(
        ErrorCodes.E_PORT_IN_USE,
        `El puerto solicitado ${basePort} ya está en uso.`,
        { details: { port: basePort } }
      );
    }

    for (let i = 1; i < maxAttempts; i++) {
      const port = basePort + i;
      if (await this.isPortAvailable(port)) {
        return port;
      }
    }

    throw new KyrnexError(
      ErrorCodes.E_PORT_IN_USE,
      `No se encontró ningún puerto libre en el rango ${basePort}-${basePort + maxAttempts - 1}.`
    );
  }

  /**
   * Starts native HTTP server with connection tracking
   * @private
   */
  async #startServer(app, port, sockets) {
    return new Promise((resolve, reject) => {
      const server = app.listen(port, () => {
        resolve(server);
      });

      // Track active sockets for immediate graceful destruction on shutdown
      server.on("connection", (socket) => {
        sockets.add(socket);
        socket.once("close", () => {
          sockets.delete(socket);
        });
      });

      server.on("error", (error) => {
        if (error.code === "EADDRINUSE") {
          reject(
            new KyrnexError(ErrorCodes.E_PORT_IN_USE, `El puerto ${port} está en uso`, {
              details: { port, error: error.code }
            })
          );
        } else if (error.code === "EACCES") {
          reject(
            new KyrnexError(ErrorCodes.E_PERMISSION_DENIED, `Permisos insuficientes para el puerto ${port}`)
          );
        } else {
          reject(error);
        }
      });
    });
  }

  /**
   * Create and start a new Express server instance
   * Supports BOTH object config and legacy positional arguments:
   *   newServer({ name, routers, port, ... })
   *   newServer(name, port, routers, appDir)
   *
   * @async
   * @param {Object|string} configOrName - Server configuration object or server name
   * @param {number} [legacyPort] - Port (when using legacy signature)
   * @param {Array|string} [legacyRouters] - Routers (when using legacy signature)
   * @returns {Promise<string>} URL of the running server
   */
  async newServer(configOrName, legacyPort, legacyRouters) {
    // Normalization for legacy positional arguments
    let config;
    if (typeof configOrName === "string" && legacyPort !== undefined) {
      config = {
        name: configOrName,
        port: legacyPort,
        routers: legacyRouters || [],
      };
    } else if (typeof configOrName === "object" && configOrName !== null) {
      config = { ...configOrName };
    } else {
      throw new KyrnexError(ErrorCodes.E_MANIFEST_INVALID, "Configuración inválida para newServer");
    }

    const {
      name,
      routers,
      port,
      appDir = null,
      pathViews = null,
      pathPublic = null,
      watchFile = false,
      launch = false,
      autoPortFallback = true,
      cors = false,
      healthCheck = true,
    } = config;

    if (!name || typeof name !== "string") {
      throw new KyrnexError(ErrorCodes.E_MANIFEST_INVALID, "El nombre del servidor es requerido");
    }

    // Check if server with this name already exists
    if (this.#instances.has(name)) {
      const existing = this.#instances.get(name);
      return `http://localhost:${existing.port}/`;
    }

    this.emit("serverStarting", { name, requestedPort: port });
    logger?.info("DynExpress", `Iniciando servidor para '${name}' en puerto base ${port}`);

    try {
      const { type, value } = this.#validateRouters(routers);

      let appRoutes;
      let moduleLoad;

      if (type === "file") {
        moduleLoad = await this.#dynreload.preload(value);

        if (launch && typeof launch === "string") {
          if (!moduleLoad[launch]) {
            throw new KyrnexError(
              ErrorCodes.E_MANIFEST_INVALID,
              `Propiedad '${launch}' no encontrada en el módulo router`
            );
          }
          appRoutes = moduleLoad[launch];
        } else {
          appRoutes = moduleLoad;
        }
      } else {
        appRoutes = value;
      }

      // If healthCheck is enabled, add a lightweight health endpoint
      if (healthCheck) {
        const healthPath = typeof healthCheck === "string" ? healthCheck : "/_kyrnex/health";
        const healthRoute = {
          method: "get",
          path: healthPath,
          handler: (req, res) => {
            res.json({
              status: "ok",
              server: name,
              engine: "DynExpress v2.0 (KyrnForge)",
              uptimeSeconds: Math.floor((Date.now() - startTime.getTime()) / 1000),
              timestamp: new Date().toISOString(),
            });
          },
        };
        appRoutes = [healthRoute, ...appRoutes];
      }

      // Find available port
      const availablePort = await this.#findAvailablePort(port, 20, autoPortFallback);

      // Create Express app
      const app = express();
      const sockets = new Set();
      const dynamicMiddlewares = [];

      // Stats telemetry container
      const stats = {
        requestsTotal: 0,
        requests2xx: 0,
        requests4xx: 0,
        requests5xx: 0,
        statusCodes: {},
        lastResponseTimeMs: 0,
        startTime: new Date(),
      };

      // Configure middleware
      this.#setupMiddleware(app, { appDir, pathViews, pathPublic, cors, stats, dynamicMiddlewares });

      // Setup routes
      this.#setupRoutes(app, appRoutes);

      // Start server listener with socket tracking
      const server = await this.#startServer(app, availablePort, sockets);
      const startTime = new Date();
      const url = `http://localhost:${availablePort}/`;

      // Store server instance
      this.#instances.set(name, {
        app,
        server,
        sockets,
        routers,
        appDir,
        pathViews,
        pathPublic,
        port: availablePort,
        watchFile,
        launch,
        moduleLoad,
        startTime,
        stats,
        cors,
        dynamicMiddlewares,
      });

      // Setup hot reloading if enabled
      if (watchFile && type === "file") {
        await this.#setupHotReloading(name, value, launch);
      }

      const instanceInfo = {
        name,
        port: availablePort,
        url,
        startTime,
      };

      this.emit("serverCreated", instanceInfo);
      this.emit("serverStarted", instanceInfo);
      logger?.info("DynExpress", `Servidor '${name}' escuchando exitosamente en ${url}`);

      return url;
    } catch (error) {
      this.emit("serverError", { name, error });
      logger?.error("DynExpress", `Fallo al iniciar servidor '${name}'`, error);
      throw error;
    }
  }

  /**
   * Setup hot reloading for a server instance
   * @private
   */
  async #setupHotReloading(serverName, routerFile, launch) {
    this.#dynreload.setRouteUpdateCallback(routerFile, async (newRoutes) => {
      try {
        const instance = this.#instances.get(serverName);
        if (!instance) return;

        this.#instances.set(serverName, {
          ...instance,
          moduleLoad: newRoutes,
          lastUpdated: new Date(),
        });

        const routes =
          launch && typeof launch === "string"
            ? newRoutes[launch] || newRoutes
            : newRoutes;

        instance.app._router.stack = instance.app._router.stack.filter(
          (layer) => !layer.route
        );

        this.#setupRoutes(instance.app, routes);
        this.emit("serverUpdated", { name: serverName, lastUpdated: new Date() });
        logger?.info("DynExpress", `Rutas actualizadas dinámicamente para '${serverName}'`);
      } catch (error) {
        this.emit("serverError", { name: serverName, error });
        logger?.error("DynExpress", `Error en hot-reload de '${serverName}'`, error);
      }
    });

    await this.#dynreload.watchFile(routerFile);
  }

  /**
   * Check if a server instance is currently running
   * @param {string} serverName
   * @returns {boolean}
   */
  isRunning(serverName) {
    return this.#instances.has(serverName);
  }

  /**
   * Stop a server instance immediately freeing all sockets
   * @async
   * @param {string} serverName - Name of the server to stop
   * @returns {Promise<boolean>} True if server was stopped successfully
   */
  async stopServer(serverName) {
    const instance = this.#instances.get(serverName);
    if (!instance) {
      throw new KyrnexError(ErrorCodes.E_SERVER_NOT_FOUND, `Servidor '${serverName}' no encontrado`);
    }

    this.emit("serverStopping", { name: serverName, port: instance.port });
    logger?.info("DynExpress", `Deteniendo servidor '${serverName}' (puerto ${instance.port})`);

    if (instance.watchFile && typeof instance.routers === "string") {
      this.#dynreload.stopWatching(instance.routers);
    }

    // Destroy active sockets immediately so server.close() never hangs
    if (instance.sockets) {
      for (const socket of instance.sockets) {
        try {
          socket.destroy();
        } catch {}
      }
      instance.sockets.clear();
    }

    return new Promise((resolve, reject) => {
      instance.server.close((err) => {
        if (err) {
          this.emit("serverError", { name: serverName, error: err });
          reject(err);
        } else {
          const port = instance.port;
          this.#instances.delete(serverName);
          this.emit("serverStopped", { name: serverName, port });
          logger?.info("DynExpress", `Servidor '${serverName}' detenido correctamente`);
          resolve(true);
        }
      });
    });
  }

  /**
   * Reset a server instance (stop and restart)
   * @async
   * @param {string} serverName - Name of the server to reset
   * @returns {Promise<string>} URL of the restarted server
   */
  async resetServer(serverName) {
    const instance = this.#instances.get(serverName);
    if (!instance) {
      throw new KyrnexError(ErrorCodes.E_SERVER_NOT_FOUND, `Servidor '${serverName}' no encontrado`);
    }

    this.emit("serverRestarting", { name: serverName, port: instance.port });
    logger?.info("DynExpress", `Reiniciando servidor '${serverName}'...`);

    const config = {
      name: serverName,
      routers: instance.routers,
      port: instance.port,
      appDir: instance.appDir,
      pathViews: instance.pathViews,
      pathPublic: instance.pathPublic,
      watchFile: instance.watchFile,
      launch: instance.launch,
      cors: instance.cors,
    };

    await this.stopServer(serverName);
    return this.newServer(config);
  }

  /**
   * Add a new single route to an existing server
   */
  addRoute(serverName, { method, path: routePath, middleware, handler }) {
    if (!method || typeof method !== "string") {
      throw new Error("Route method is required and must be a string");
    }

    if (!routePath || typeof routePath !== "string") {
      throw new Error("Route path is required and must be a string");
    }

    if (!handler || typeof handler !== "function") {
      throw new Error("Route handler is required and must be a function");
    }

    const instance = this.#instances.get(serverName);
    if (!instance) {
      throw new KyrnexError(ErrorCodes.E_SERVER_NOT_FOUND, `Servidor '${serverName}' no encontrado`);
    }

    const methodLower = method.toLowerCase();
    if (middleware && typeof middleware === "function") {
      instance.app[methodLower](routePath, middleware, handler);
    } else {
      instance.app[methodLower](routePath, handler);
    }
  }

  /**
   * [NEW v2.0] Batch add multiple routes at once
   * @param {string} serverName
   * @param {Array<Object>} routesArray
   */
  addRoutes(serverName, routesArray) {
    if (!Array.isArray(routesArray)) {
      throw new TypeError("routesArray must be an array");
    }
    routesArray.forEach((r) => this.addRoute(serverName, r));
  }

  /**
   * [NEW v2.0] Register custom Express middleware dynamically
   * @param {string} serverName
   * @param {string|Function} pathOrMiddleware
   * @param {Function} [maybeMiddleware]
   */
  use(serverName, pathOrMiddleware, maybeMiddleware) {
    const instance = this.#instances.get(serverName);
    if (!instance) {
      throw new KyrnexError(ErrorCodes.E_SERVER_NOT_FOUND, `Servidor '${serverName}' no encontrado`);
    }

    if (typeof pathOrMiddleware === "string" && typeof maybeMiddleware === "function") {
      if (instance.dynamicMiddlewares) {
        instance.dynamicMiddlewares.push({ path: pathOrMiddleware, fn: maybeMiddleware });
      }
      instance.app.use(pathOrMiddleware, maybeMiddleware);
    } else if (typeof pathOrMiddleware === "function") {
      if (instance.dynamicMiddlewares) {
        instance.dynamicMiddlewares.push({ path: null, fn: pathOrMiddleware });
      }
      instance.app.use(pathOrMiddleware);
    } else {
      throw new TypeError("Middleware must be a function or (path, middleware)");
    }
  }

  /**
   * [NEW v2.0] Mount a sub-router or route list under a path prefix
   * @param {string} serverName
   * @param {string} prefix
   * @param {Array|RouteBuilder} subRoutes
   */
  mount(serverName, prefix, subRoutes) {
    const instance = this.#instances.get(serverName);
    if (!instance) {
      throw new KyrnexError(ErrorCodes.E_SERVER_NOT_FOUND, `Servidor '${serverName}' no encontrado`);
    }

    const cleanPrefix = prefix.replace(/\/+$/, "");
    const routes = subRoutes instanceof RouteBuilder ? subRoutes.build() : subRoutes;

    if (!Array.isArray(routes)) {
      throw new TypeError("Mounted routes must be an array or RouteBuilder");
    }

    routes.forEach((r) => {
      const fullPath = `${cleanPrefix}${r.path.startsWith("/") ? r.path : "/" + r.path}`;
      this.addRoute(serverName, { ...r, path: fullPath });
    });
  }

  /**
   * [NEW v2.0] Enable or configure CORS dynamically on a server
   * @param {string} serverName
   * @param {boolean|string|Object} options
   */
  setCors(serverName, options = true) {
    const origin = typeof options === "string" ? options : (options?.origin || "*");
    this.use(serverName, (req, res, next) => {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept");
      if (req.method === "OPTIONS") {
        return res.sendStatus(204);
      }
      next();
    });
  }

  /**
   * [NEW v2.0] Add a static directory dynamically
   * @param {string} serverName
   * @param {string} dirPath
   */
  setStatic(serverName, dirPath) {
    const instance = this.#instances.get(serverName);
    if (!instance) {
      throw new KyrnexError(ErrorCodes.E_SERVER_NOT_FOUND, `Servidor '${serverName}' no encontrado`);
    }

    const resolved = instance.appDir ? path.resolve(instance.appDir, dirPath) : path.resolve(dirPath);
    if (fs.existsSync(resolved)) {
      instance.app.use(express.static(resolved));
      return true;
    }
    return false;
  }

  /**
   * [NEW v2.0] Graceful port rebind without restarting node process
   * @param {string} serverName
   * @param {number} newPort
   * @returns {Promise<string>} New server URL
   */
  async rebindPort(serverName, newPort) {
    const instance = this.#instances.get(serverName);
    if (!instance) {
      throw new KyrnexError(ErrorCodes.E_SERVER_NOT_FOUND, `Servidor '${serverName}' no encontrado`);
    }

    const isAvailable = await this.isPortAvailable(newPort);
    if (!isAvailable) {
      throw new KyrnexError(ErrorCodes.E_PORT_IN_USE, `El puerto ${newPort} ya está en uso.`);
    }

    const oldPort = instance.port;
    const config = {
      name: serverName,
      routers: instance.routers,
      port: newPort,
      appDir: instance.appDir,
      pathViews: instance.pathViews,
      pathPublic: instance.pathPublic,
      watchFile: instance.watchFile,
      launch: instance.launch,
      autoPortFallback: false,
    };

    await this.stopServer(serverName);
    const newUrl = await this.newServer(config);
    logger?.info("DynExpress", `Servidor '${serverName}' re-enlazado del puerto ${oldPort} al ${newPort}`);
    return newUrl;
  }

  /**
   * [NEW v2.0] Get live telemetry metrics and statistics
   * @param {string} serverName
   * @returns {Object}
   */
  getServerStats(serverName) {
    const instance = this.#instances.get(serverName);
    if (!instance) return null;

    const uptimeSec = Math.floor((Date.now() - instance.startTime.getTime()) / 1000);
    const m = Math.floor(uptimeSec / 60);
    const s = uptimeSec % 60;
    const uptimeFormatted = m > 0 ? `${m}m ${s}s` : `${s}s`;

    return {
      name: serverName,
      port: instance.port,
      uptimeSeconds: uptimeSec,
      uptimeFormatted,
      requestsTotal: instance.stats?.requestsTotal || 0,
      totalRequests: instance.stats?.requestsTotal || 0,
      requests2xx: instance.stats?.requests2xx || 0,
      requests4xx: instance.stats?.requests4xx || 0,
      requests5xx: instance.stats?.requests5xx || 0,
      statusCodes: instance.stats?.statusCodes || {},
      lastResponseTimeMs: instance.stats?.lastResponseTimeMs || 0,
      activeSockets: instance.sockets ? instance.sockets.size : 0,
      routesCount: this.getRouteList(serverName).length,
    };
  }

  /**
   * [NEW v2.0] Introspect registered routes on a server
   * @param {string} serverName
   * @returns {Array<Object>}
   */
  getRouteList(serverName) {
    const instance = this.#instances.get(serverName);
    if (!instance || !instance.app._router?.stack) return [];

    const list = [];
    instance.app._router.stack.forEach((layer) => {
      if (layer.route) {
        list.push({
          path: layer.route.path,
          methods: Object.keys(layer.route.methods).map((m) => m.toUpperCase()),
        });
      }
    });
    return list;
  }

  /**
   * Get information about all server instances
   * @returns {Array<Object>} Array of server instance information
   */
  getInstances() {
    return Array.from(this.#instances.entries()).map(([name, instance]) => ({
      name,
      port: instance.port,
      url: `http://localhost:${instance.port}/`,
      startTime: instance.startTime,
      lastUpdated: instance.lastUpdated || instance.startTime,
      watchingFile: instance.watchFile,
      routes: this.getRouteList(name),
      stats: this.getServerStats(name),
    }));
  }

  /**
   * Get detailed information about a specific server instance
   * @param {string} serverName - Name of the server
   * @returns {Object} Server instance information
   */
  getInstance(serverName) {
    const instance = this.#instances.get(serverName);
    if (!instance) {
      throw new KyrnexError(ErrorCodes.E_SERVER_NOT_FOUND, `Servidor '${serverName}' no encontrado`);
    }

    return {
      name: serverName,
      port: instance.port,
      url: `http://localhost:${instance.port}/`,
      startTime: instance.startTime,
      lastUpdated: instance.lastUpdated || instance.startTime,
      watchingFile: instance.watchFile,
      routes: this.getRouteList(serverName),
      stats: this.getServerStats(serverName),
    };
  }

  /**
   * Clean up all server instances and watchers
   * @async
   */
  async cleanup() {
    const names = Array.from(this.#instances.keys());
    const stopPromises = names.map((name) =>
      this.stopServer(name).catch((err) => {
        logger?.error("DynExpress", `Error al detener servidor '${name}' en cleanup`, err);
      })
    );

    await Promise.all(stopPromises);
    this.#dynreload.cleanup();
    return names.length;
  }

  // ==========================================
  // Backward Compatibility & Semantic Aliases
  // ==========================================

  /**
   * Semantic alias for newServer
   */
  async startServer(...args) {
    return this.newServer(...args);
  }

  /**
   * Semantic alias for resetServer
   */
  async restartServer(...args) {
    return this.resetServer(...args);
  }

  /**
   * Semantic alias for getInstances
   */
  getAllServers() {
    return this.getInstances();
  }

  /**
   * Semantic alias for getInstance
   */
  getServer(serverName) {
    return this.getInstance(serverName);
  }

  /**
   * Semantic alias for cleanup
   */
  async stopAll() {
    return this.cleanup();
  }
}

export default DynExpress;
export const dyn = new DynExpress();
export { DynExpressError, KyrnexError, ErrorCodes, logger };

