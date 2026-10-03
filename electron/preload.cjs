/**
 * Kyrnex Electron Preload Script (CommonJS for Electron preload compatibility)
 */

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("kyrnexAPI", {
  // Window controls
  windowControls: {
    minimize: () => ipcRenderer.invoke("window:minimize"),
    maximize: () => ipcRenderer.invoke("window:maximize"),
    close: () => ipcRenderer.invoke("window:close"),
    isMaximized: () => ipcRenderer.invoke("window:isMaximized"),
  },

  // Native OS dialogs
  dialogs: {
    selectDirectory: (defaultPath) => ipcRenderer.invoke("dialog:selectDirectory", defaultPath),
    selectFile: (filters) => ipcRenderer.invoke("dialog:selectFile", filters),
  },

  // Shell integration
  system: {
    openExternal: (url) => ipcRenderer.invoke("system:openExternal", url),
    openPath: (folderPath) => ipcRenderer.invoke("system:openPath", folderPath),
    getPlatform: () => process.platform,
  },

  // Multi-server operations
  servers: {
    getAll: () => ipcRenderer.invoke("servers:getAll"),
    getOne: (id) => ipcRenderer.invoke("servers:getOne", id),
    create: (config) => ipcRenderer.invoke("servers:create", config),
    update: (id, updates) => ipcRenderer.invoke("servers:update", id, updates),
    delete: (id) => ipcRenderer.invoke("servers:delete", id),
    start: (id) => ipcRenderer.invoke("servers:start", id),
    stop: (id) => ipcRenderer.invoke("servers:stop", id),
    restart: (id) => ipcRenderer.invoke("servers:restart", id),
  },

  // Native preview capture & cache
  preview: {
    capture: (id) => ipcRenderer.invoke("preview:capture", id),
    getCached: (id) => ipcRenderer.invoke("preview:getCached", id),
  },

  // Console & structured logs
  logs: {
    getLogs: (limit) => ipcRenderer.invoke("logs:get", limit),
    clearLogs: () => ipcRenderer.invoke("logs:clear"),
    onLog: (callback) => {
      const sub = (event, entry) => callback(entry);
      ipcRenderer.on("log:entry", sub);
      return () => ipcRenderer.removeListener("log:entry", sub);
    },
  },

  // Real-time server push events
  events: {
    onServerStatusChanged: (callback) => {
      const sub = (event, data) => callback(data);
      ipcRenderer.on("server:statusChanged", sub);
      return () => ipcRenderer.removeListener("server:statusChanged", sub);
    },
    onServerMetrics: (callback) => {
      const sub = (event, data) => callback(data);
      ipcRenderer.on("server:metrics", sub);
      return () => ipcRenderer.removeListener("server:metrics", sub);
    },
    onPreviewUpdated: (callback) => {
      const sub = (event, data) => callback(data);
      ipcRenderer.on("server:previewUpdated", sub);
      return () => ipcRenderer.removeListener("server:previewUpdated", sub);
    },
  },

  // Native Updater
  updater: {
    getConfig: () => ipcRenderer.invoke("updater:getConfig"),
    saveConfig: (config) => ipcRenderer.invoke("updater:saveConfig", config),
    checkForUpdates: (feedUrl) => ipcRenderer.invoke("updater:check", feedUrl),
    installUpdate: (updateInfo) => ipcRenderer.invoke("updater:install", updateInfo),
    relaunch: () => ipcRenderer.invoke("updater:relaunch"),
    onUpdateAvailable: (callback) => {
      const sub = (event, data) => callback(data);
      ipcRenderer.on("updater:available", sub);
      return () => ipcRenderer.removeListener("updater:available", sub);
    },
    onUpdateDownloaded: (callback) => {
      const sub = (event, data) => callback(data);
      ipcRenderer.on("updater:downloaded", sub);
      return () => ipcRenderer.removeListener("updater:downloaded", sub);
    },
  },
});
