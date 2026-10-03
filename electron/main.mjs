/**
 * Kyrnex Desktop Runtime - Main Process
 * Manages native window, IPC bridges, native dialogs, and native offscreen page capture
 */

import { app, BrowserWindow, ipcMain, dialog, shell } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { serverManager } from "../core/manager/ServerManager.mjs";
import { logger } from "../core/logger/Logger.mjs";
import { NativeUpdater } from "../core/updater/NativeUpdater.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, "..");

const nativeUpdater = new NativeUpdater({
  appRoot,
  currentVersion: app.getVersion() || "1.0.0",
});

let splashWindow = null;
let mainWindow = null;

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 500,
    height: 300,
    frame: false,
    resizable: false,
    center: true,
    alwaysOnTop: true,
    backgroundColor: "#090d16",
    title: "Kyrnex - Iniciando...",
    icon: path.join(__dirname, "../assets/icon.png"),
    show: true,
    webPreferences: {
      sandbox: true,
    },
  });

  splashWindow.loadFile(path.join(__dirname, "splash.html"));
}

async function createWindow() {
  const launchStartTime = Date.now();

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 800,
    minHeight: 580,
    center: true,
    frame: false, // Frameless for custom header matching the UI screenshot
    backgroundColor: "#0b0f17",
    title: "Kyrnex - Local Web Runtime",
    icon: path.join(__dirname, "../assets/icon.png"),
    show: false, // Hidden until content is loaded and ready
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const showMainWindow = () => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      mainWindow.show();
      mainWindow.focus();
      if (splashWindow && !splashWindow.isDestroyed()) {
        try {
          splashWindow.close();
          splashWindow = null;
        } catch {}
      }
    }
  };

  // Transition from splash to main window once ready to show
  mainWindow.once("ready-to-show", () => {
    const elapsed = Date.now() - launchStartTime;
    const minSplashDuration = 1200; // Keep splash visible briefly for polished feel
    const remainingTime = Math.max(0, minSplashDuration - elapsed);

    setTimeout(() => {
      showMainWindow();
    }, remainingTime);
  });

  // Safety fallback in case ready-to-show is delayed
  setTimeout(() => {
    showMainWindow();
  }, 4000);

  logger.info("Sistema", "Ventana principal de Kyrnex inicializada");

  // Native offscreen screenshot capture via Electron
  serverManager.setCapturePageHandler(async (url) => {
    return new Promise((resolve, reject) => {
      const offscreenWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        show: false,
        webPreferences: {
          offscreen: true,
          sandbox: true,
        },
      });

      const timer = setTimeout(() => {
        try {
          offscreenWindow.destroy();
        } catch {}
        reject(new Error("Tiempo de espera agotado al renderizar captura"));
      }, 10000);

      offscreenWindow.webContents.on("did-finish-load", () => {
        setTimeout(async () => {
          try {
            const image = await offscreenWindow.webContents.capturePage();
            clearTimeout(timer);
            offscreenWindow.destroy();
            resolve(image.toPNG());
          } catch (err) {
            clearTimeout(timer);
            try {
              offscreenWindow.destroy();
            } catch {}
            reject(err);
          }
        }, 500);
      });

      offscreenWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription) => {
        clearTimeout(timer);
        try {
          offscreenWindow.destroy();
        } catch {}
        reject(new Error(`Error de carga (${errorCode}): ${errorDescription}`));
      });

      offscreenWindow.loadURL(url).catch((err) => {
        clearTimeout(timer);
        try {
          offscreenWindow.destroy();
        } catch {}
        reject(err);
      });
    });
  });

  // Forward events to renderer
  serverManager.on("serverStatusChanged", (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("server:statusChanged", data);
    }
  });

  serverManager.on("serverMetrics", (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("server:metrics", data);
    }
  });

  serverManager.on("previewUpdated", (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("server:previewUpdated", data);
    }
  });

  logger.on("log", (entry) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("log:entry", entry);
    }
  });

  nativeUpdater.on("update-available", (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("updater:available", data);
    }
  });

  nativeUpdater.on("update-downloaded", (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("updater:downloaded", data);
    }
  });

  // Load UI
  const isDev = process.env.NODE_ENV === "development";
  const devUrl = "http://localhost:5173";

  if (isDev) {
    try {
      await mainWindow.loadURL(devUrl);
    } catch {
      const distPath = path.join(__dirname, "../dist/index.html");
      await mainWindow.loadFile(distPath);
    }
  } else {
    const distPath = path.join(__dirname, "../dist/index.html");
    await mainWindow.loadFile(distPath);
  }
}

// Window control IPC
ipcMain.handle("window:minimize", () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle("window:maximize", () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
    return mainWindow.isMaximized();
  }
  return false;
});

ipcMain.handle("window:close", () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle("window:isMaximized", () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

// Native OS dialogs
ipcMain.handle("dialog:selectDirectory", async (event, defaultPath) => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Seleccionar carpeta raíz del proyecto",
    defaultPath: defaultPath || process.cwd(),
    properties: ["openDirectory", "createDirectory"],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

ipcMain.handle("dialog:selectFile", async (event, filters) => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Seleccionar archivo principal",
    properties: ["openFile"],
    filters: filters || [
      { name: "Archivos Web", extensions: ["html", "js", "mjs", "json", "ejs"] },
      { name: "Todos los archivos", extensions: ["*"] },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

// System integration
ipcMain.handle("system:openExternal", async (event, url) => {
  await shell.openExternal(url);
  return true;
});

ipcMain.handle("system:openPath", async (event, folderPath) => {
  await shell.openPath(folderPath);
  return true;
});

// Server manager IPC
ipcMain.handle("servers:getAll", async () => {
  return serverManager.getAllServers();
});

ipcMain.handle("servers:getOne", async (event, id) => {
  return serverManager.getServer(id);
});

ipcMain.handle("servers:create", async (event, config) => {
  return await serverManager.createServer(config);
});

ipcMain.handle("servers:update", async (event, id, updates) => {
  return await serverManager.updateServer(id, updates);
});

ipcMain.handle("servers:delete", async (event, id) => {
  return await serverManager.deleteServer(id);
});

ipcMain.handle("servers:start", async (event, id) => {
  return await serverManager.startServer(id);
});

ipcMain.handle("servers:stop", async (event, id) => {
  return await serverManager.stopServer(id);
});

ipcMain.handle("servers:restart", async (event, id) => {
  return await serverManager.restartServer(id);
});

// Preview IPC
ipcMain.handle("preview:capture", async (event, id) => {
  return await serverManager.capturePreview(id);
});

ipcMain.handle("preview:getCached", async (event, id) => {
  return serverManager.getCachedPreview(id);
});

// Logs IPC
ipcMain.handle("logs:get", async (event, limit) => {
  return logger.getLogs(limit);
});

ipcMain.handle("logs:clear", async () => {
  logger.clear();
  return true;
});

// Native Updater IPC
ipcMain.handle("updater:getConfig", async () => {
  return await nativeUpdater.getConfig();
});

ipcMain.handle("updater:saveConfig", async (event, config) => {
  return await nativeUpdater.saveConfig(config);
});

ipcMain.handle("updater:check", async (event, feedUrl) => {
  return await nativeUpdater.checkForUpdates(feedUrl);
});

ipcMain.handle("updater:install", async (event, updateInfo) => {
  return await nativeUpdater.downloadAndInstall(updateInfo);
});

ipcMain.handle("updater:relaunch", () => {
  app.relaunch();
  app.exit(0);
});

// App Lifecycle
app.whenReady().then(async () => {
  createSplashWindow();
  await createWindow();

  // Autostart servers configured with autoStart
  const servers = serverManager.getAllServers();
  for (const srv of servers) {
    if (srv.autoStart) {
      serverManager.startServer(srv.id).catch((err) => {
        logger.warn("ServerManager", `No se pudo autoiniciar '${srv.name}': ${err.message}`);
      });
    }
  }

  // Automatic update check in background (non-blocking)
  setTimeout(async () => {
    try {
      const cfg = await nativeUpdater.getConfig();
      if (cfg.autoCheck) {
        logger.info("Actualizador", "Comprobando actualizaciones del sistema...");
        const res = await nativeUpdater.checkForUpdates(cfg.feedUrl);
        if (res.hasUpdate) {
          logger.info("Actualizador", `Nueva versión disponible: v${res.latestVersion}`);
          if (cfg.autoInstall) {
            logger.info("Actualizador", "Instalando actualización automáticamente en segundo plano...");
            await nativeUpdater.downloadAndInstall(res);
          }
        }
      }
    } catch (err) {
      logger.warn("Actualizador", `Comprobación omitida: ${err.message}`);
    }
  }, 4500);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

let isCleaningUp = false;

app.on("before-quit", async (event) => {
  if (!isCleaningUp) {
    event.preventDefault();
    isCleaningUp = true;
    try {
      await serverManager.cleanup();
    } catch (err) {
      console.error("[Kyrnex] Error during cleanup:", err);
    }
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
