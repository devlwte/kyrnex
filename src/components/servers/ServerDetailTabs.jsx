import React, { useState, useEffect } from "react";
import {
  Settings,
  FolderClosed,
  LayoutGrid,
  Sliders,
  Folder,
  FileCode,
  CheckCircle2,
  Copy,
  Check,
  X,
  Save,
  Search,
} from "lucide-react";
import { useTranslation } from "../../context/I18nContext";

export function ServerDetailTabs({
  server,
  onSave,
  onCancel,
  onToggleStatus,
}) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("config");
  const [copied, setCopied] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [port, setPort] = useState(3000);
  const [rootDir, setRootDir] = useState("");
  const [publicDir, setPublicDir] = useState("public");
  const [viewsDir, setViewsDir] = useState("views");
  const [mainFile, setMainFile] = useState("index.html");
  const [autoStart, setAutoStart] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (server) {
      setName(server.name || "");
      setPort(server.port || 3000);
      setRootDir(server.rootDir || "");
      setPublicDir(server.publicDir || "");
      setViewsDir(server.viewsDir !== undefined ? server.viewsDir : "views");
      setMainFile(server.mainFile || "index.html");
      setAutoStart(Boolean(server.autoStart));
      setIsRunning(server.status === "running");
    }
  }, [server]);

  if (!server) {
    return (
      <div className="h-full flex items-center justify-center border dark:border-kyrn-border border-slate-200 rounded-xl dark:bg-kyrn-card bg-white p-8 dark:text-slate-400 text-slate-500 text-xs">
        {t("servers.selectServerNotice", "Selecciona un servidor para ver y editar su configuración.")}
      </div>
    );
  }

  const handleCopyUrl = () => {
    const url = `http://localhost:${port}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBrowseFolder = async () => {
    const selected = await window.kyrnexAPI?.dialogs?.selectDirectory(rootDir);
    if (selected) {
      setRootDir(selected);
    }
  };

  const handleSave = () => {
    onSave(server.id, {
      name: name.trim(),
      port: parseInt(port, 10),
      rootDir: rootDir.trim(),
      publicDir: publicDir.trim(),
      viewsDir: viewsDir.trim(),
      mainFile: mainFile.trim(),
      autoStart,
      status: isRunning ? "running" : "stopped",
    });
  };

  const tabs = [
    { id: "config", label: t("servers.tabs.config", "Configuración"), icon: Settings },
    { id: "folders", label: t("servers.tabs.folders", "Carpetas"), icon: FolderClosed },
    { id: "apps", label: t("servers.tabs.apps", "Aplicaciones"), icon: LayoutGrid },
    { id: "advanced", label: t("servers.tabs.advanced", "Avanzado"), icon: Sliders },
  ];

  return (
    <div className="dark:bg-kyrn-card bg-white border dark:border-kyrn-border border-slate-200 rounded-xl flex flex-col justify-between overflow-hidden shadow-sm transition-colors duration-200">
      {/* Tab Navigation Header */}
      <div className="flex items-center gap-3 sm:gap-6 px-4 sm:px-6 pt-4 border-b dark:border-kyrn-border/80 border-slate-200 overflow-x-auto horizontal-scroll flex-shrink-0">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 pb-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${
                isActive
                  ? "border-kyrn-blue dark:text-white text-slate-900"
                  : "border-transparent dark:text-slate-400 text-slate-500 hover:dark:text-slate-200 hover:text-slate-800"
              }`}
            >
              <Icon size={15} className={isActive ? "text-kyrn-blue" : "text-slate-400"} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="p-4 sm:p-6 space-y-6 overflow-y-auto max-h-[460px]">
        {activeTab === "config" && (
          <>
            {/* Sección: Información básica */}
            <section className="space-y-3">
              <div>
                <h4 className="text-xs font-bold dark:text-white text-slate-900 tracking-wide">
                  {t("servers.basicInfo", "Información básica")}
                </h4>
                <p className="text-[11px] dark:text-slate-400 text-slate-500 mt-0.5">
                  {t("servers.basicInfoDesc", "Configura los datos principales del servidor Express.")}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 items-center">
                {/* Nombre del servidor */}
                <div className="col-span-1 sm:col-span-6 space-y-1.5">
                  <label className="text-[11px] font-medium dark:text-slate-300 text-slate-700">
                    {t("servers.serverName", "Nombre del servidor")}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full dark:bg-kyrn-input bg-slate-50 border dark:border-kyrn-border border-slate-300 rounded-lg px-3.5 py-2 text-xs dark:text-white text-slate-900 focus:outline-none focus:border-kyrn-blue transition-colors"
                  />
                </div>

                {/* Puerto */}
                <div className="col-span-1 sm:col-span-3 space-y-1.5">
                  <label className="text-[11px] font-medium dark:text-slate-300 text-slate-700">
                    {t("servers.port", "Puerto")}
                  </label>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    min={1024}
                    max={65535}
                    className="w-full dark:bg-kyrn-input bg-slate-50 border dark:border-kyrn-border border-slate-300 rounded-lg px-3.5 py-2 text-xs dark:text-white text-slate-900 focus:outline-none focus:border-kyrn-blue transition-colors font-mono"
                  />
                </div>

                {/* Estado Switch */}
                <div className="col-span-1 sm:col-span-3 space-y-1.5 flex flex-col items-start sm:pl-2">
                  <label className="text-[11px] font-medium dark:text-slate-300 text-slate-700">
                    {t("servers.status", "Estado")}
                  </label>
                  <div className="flex items-center gap-3 h-[38px]">
                    <button
                      type="button"
                      onClick={() => {
                        const newRunning = !isRunning;
                        setIsRunning(newRunning);
                        onToggleStatus(server.id, newRunning);
                      }}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isRunning ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          isRunning ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                    <span
                      className={`text-xs font-semibold ${
                        isRunning
                          ? "dark:text-emerald-400 text-emerald-600"
                          : "dark:text-slate-400 text-slate-500"
                      }`}
                    >
                      {isRunning ? t("common.active", "Activo") : t("common.inactive", "Inactivo")}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Sección: Configuración de rutas */}
            <section className="space-y-3 pt-2">
              <div>
                <h4 className="text-xs font-bold dark:text-white text-slate-900 tracking-wide">
                  {t("servers.routesConfig", "Configuración de rutas")}
                </h4>
                <p className="text-[11px] dark:text-slate-400 text-slate-500 mt-0.5">
                  {t("servers.routesConfigDesc", "Define la carpeta pública y el archivo principal.")}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4">
                {/* Carpeta raíz del proyecto */}
                <div className="col-span-1 sm:col-span-12 space-y-1.5">
                  <label className="text-[11px] font-medium dark:text-slate-300 text-slate-700">
                    {t("servers.projectRootDir", "Carpeta raíz del proyecto")}
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Folder
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        type="text"
                        value={rootDir}
                        onChange={(e) => setRootDir(e.target.value)}
                        className="w-full dark:bg-kyrn-input bg-slate-50 border dark:border-kyrn-border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs dark:text-white text-slate-900 focus:outline-none focus:border-kyrn-blue font-mono transition-colors"
                      />
                    </div>
                    <button
                      onClick={handleBrowseFolder}
                      className="flex items-center gap-1.5 dark:bg-[#1b263b] bg-blue-50 hover:dark:bg-[#23334f] hover:bg-blue-100 dark:text-blue-300 text-blue-600 px-3 py-2 rounded-lg text-xs font-medium border dark:border-blue-500/30 border-blue-200 transition-colors flex-shrink-0"
                      title={t("servers.searchFolderTooltip", "Seleccionar carpeta en Windows")}
                    >
                      <Search size={13} />
                      <span>{t("servers.searchFolder", "Buscar")}</span>
                    </button>
                  </div>
                </div>

                {/* Carpeta pública */}
                <div className="col-span-1 sm:col-span-6 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-medium dark:text-slate-300 text-slate-700">
                      {t("servers.publicFolder", "Carpeta pública")}
                    </label>
                    {publicDir ? (
                      <button
                        type="button"
                        onClick={() => setPublicDir("")}
                        className="text-[10px] text-blue-500 hover:text-blue-600 dark:text-blue-400 font-medium hover:underline"
                      >
                        {t("servers.leaveInRoot", "Dejar en raíz (\"\")")}
                      </button>
                    ) : (
                      <span className="text-[10px] text-emerald-500 font-medium">
                        {t("servers.inRoot", "✓ En la raíz")}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Folder
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      value={publicDir}
                      onChange={(e) => setPublicDir(e.target.value)}
                      placeholder={t("servers.publicFolderPlaceholder", "public (dejar vacío si está en la raíz)")}
                      className="w-full dark:bg-kyrn-input bg-slate-50 border dark:border-kyrn-border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs dark:text-white text-slate-900 focus:outline-none focus:border-kyrn-blue font-mono transition-colors"
                    />
                  </div>
                  <p className="text-[10px] dark:text-slate-400 text-slate-500">
                    {publicDir
                      ? `${t("servers.servedFrom", "Se sirve desde:")} ${publicDir}`
                      : t("servers.servedFromRoot", "Archivos servidos directamente desde el directorio raíz.")}
                  </p>
                </div>

                {/* Carpeta vistas (EJS) */}
                <div className="col-span-1 sm:col-span-6 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-medium dark:text-slate-300 text-slate-700">
                      {t("servers.viewsFolder", "Carpeta vistas / plantillas (EJS)")}
                    </label>
                    {viewsDir ? (
                      <button
                        type="button"
                        onClick={() => setViewsDir("")}
                        className="text-[10px] text-blue-500 hover:text-blue-600 dark:text-blue-400 font-medium hover:underline"
                      >
                        {t("servers.leaveInRoot", "Dejar en raíz (\"\")")}
                      </button>
                    ) : (
                      <span className="text-[10px] text-emerald-500 font-medium">
                        {t("servers.inRoot", "✓ En la raíz")}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Folder
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      value={viewsDir}
                      onChange={(e) => setViewsDir(e.target.value)}
                      placeholder={t("servers.viewsFolderPlaceholder", "views (dejar vacío si está en la raíz)")}
                      className="w-full dark:bg-kyrn-input bg-slate-50 border dark:border-kyrn-border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs dark:text-white text-slate-900 focus:outline-none focus:border-kyrn-blue font-mono transition-colors"
                    />
                  </div>
                  <p className="text-[10px] dark:text-slate-400 text-slate-500">
                    {viewsDir
                      ? `${t("servers.viewsIn", "Plantillas en:")} ${viewsDir}`
                      : t("servers.viewsInRoot", "Plantillas EJS resueltas directamente desde la raíz.")}
                  </p>
                </div>
              </div>

              {/* Archivo principal y Caja de Acceso limpio */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 items-center pt-1">
                <div className="col-span-1 sm:col-span-6 space-y-1.5">
                  <label className="text-[11px] font-medium dark:text-slate-300 text-slate-700">
                    {t("servers.mainFile", "Archivo principal")}
                  </label>
                  <div className="relative">
                    <FileCode
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <select
                      value={mainFile}
                      onChange={(e) => setMainFile(e.target.value)}
                      className="w-full dark:bg-kyrn-input bg-slate-50 border dark:border-kyrn-border border-slate-300 rounded-lg pl-9 pr-8 py-2 text-xs dark:text-white text-slate-900 focus:outline-none focus:border-kyrn-blue appearance-none transition-colors"
                    >
                      <option value="index.html">index.html</option>
                      <option value="index.ejs">index.ejs</option>
                      <option value="app.js">app.js</option>
                      <option value="server.js">server.js</option>
                      <option value="routes.mjs">routes.mjs</option>
                      <option value="main.mjs">main.mjs</option>
                    </select>
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                      ▼
                    </span>
                  </div>
                </div>

                {/* Caja de Acceso limpio */}
                <div className="col-span-1 sm:col-span-6">
                  <div className="p-3 dark:bg-[#0a121e]/90 bg-emerald-50/80 border dark:border-emerald-500/20 border-emerald-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full dark:bg-emerald-500/10 bg-emerald-100 flex items-center justify-center dark:text-emerald-400 text-emerald-600 flex-shrink-0">
                        <CheckCircle2 size={16} />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold dark:text-emerald-400 text-emerald-700">
                          {t("servers.cleanAccess", "Acceso limpio")}
                        </p>
                        <p className="text-[10px] dark:text-slate-400 text-slate-500">
                          {t("servers.appAvailableAt", "Tu aplicación estará disponible en:")}
                        </p>
                        <p className="text-[11px] font-mono dark:text-blue-400 text-blue-600 font-medium">
                          http://localhost:{port}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleCopyUrl}
                      title={t("servers.copyUrl", "Copiar URL")}
                      className="p-1.5 rounded-lg dark:bg-slate-800/80 bg-white hover:dark:bg-slate-700 hover:bg-slate-100 dark:text-slate-300 text-slate-700 border dark:border-transparent border-slate-200 transition-colors shadow-sm"
                    >
                      {copied ? (
                        <Check size={14} className="text-emerald-500" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {activeTab === "folders" && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold dark:text-white text-slate-900">
              {t("servers.serverFolders", "Carpetas del servidor")}
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-lg dark:bg-kyrn-input bg-slate-50 border dark:border-kyrn-border border-slate-200">
                <div>
                  <p className="text-xs font-semibold dark:text-slate-200 text-slate-800">
                    {t("servers.rootDirTitle", "Directorio Raíz")}
                  </p>
                  <p className="text-[11px] dark:text-slate-400 text-slate-500 font-mono">
                    {rootDir}
                  </p>
                </div>
                <button
                  onClick={() => window.kyrnexAPI?.system?.openPath(rootDir)}
                  className="px-3 py-1.5 text-xs dark:bg-slate-800 bg-slate-200 hover:dark:bg-slate-700 hover:bg-slate-300 dark:text-blue-400 text-blue-700 font-medium rounded-md transition-colors"
                >
                  {t("servers.openInExplorer", "Abrir en Explorador")}
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg dark:bg-kyrn-input bg-slate-50 border dark:border-kyrn-border border-slate-200">
                <div>
                  <p className="text-xs font-semibold dark:text-slate-200 text-slate-800">
                    {t("servers.publicFolderTitle", "Carpeta Pública")}
                  </p>
                  <p className="text-[11px] dark:text-slate-400 text-slate-500 font-mono">
                    {publicDir ? `${rootDir}/${publicDir}` : `${rootDir} (${t("files.rootDirectoryLabel", "Directorio raíz")})`}
                  </p>
                </div>
                <button
                  onClick={() =>
                    window.kyrnexAPI?.system?.openPath(publicDir ? `${rootDir}/${publicDir}` : rootDir)
                  }
                  className="px-3 py-1.5 text-xs dark:bg-slate-800 bg-slate-200 hover:dark:bg-slate-700 hover:bg-slate-300 dark:text-blue-400 text-blue-700 font-medium rounded-md transition-colors"
                >
                  {t("servers.openInExplorer", "Abrir en Explorador")}
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg dark:bg-kyrn-input bg-slate-50 border dark:border-kyrn-border border-slate-200">
                <div>
                  <p className="text-xs font-semibold dark:text-slate-200 text-slate-800">
                    {t("servers.viewsFolderTitle", "Carpeta de Vistas / Plantillas (EJS)")}
                  </p>
                  <p className="text-[11px] dark:text-slate-400 text-slate-500 font-mono">
                    {viewsDir ? `${rootDir}/${viewsDir}` : `${rootDir} (${t("files.rootDirectoryLabel", "Directorio raíz")})`}
                  </p>
                </div>
                <button
                  onClick={() =>
                    window.kyrnexAPI?.system?.openPath(viewsDir ? `${rootDir}/${viewsDir}` : rootDir)
                  }
                  className="px-3 py-1.5 text-xs dark:bg-slate-800 bg-slate-200 hover:dark:bg-slate-700 hover:bg-slate-300 dark:text-blue-400 text-blue-700 font-medium rounded-md transition-colors"
                >
                  {t("servers.openInExplorer", "Abrir en Explorador")}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "apps" && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold dark:text-white text-slate-900">
              {t("servers.executionDetails", "Detalles de ejecución")}
            </h4>
            <div className="p-4 rounded-lg dark:bg-kyrn-input bg-slate-50 border dark:border-kyrn-border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="dark:text-slate-400 text-slate-500">
                  {t("servers.engineType", "Tipo de motor:")}
                </span>
                <span className="dark:text-white text-slate-900 font-semibold">
                  DynExpress (Express.js Dinámico)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="dark:text-slate-400 text-slate-500">
                  {t("servers.serviceStatus", "Estado del servicio:")}
                </span>
                <span
                  className={
                    isRunning
                      ? "text-emerald-500 font-bold"
                      : "dark:text-slate-400 text-slate-500 font-bold"
                  }
                >
                  {isRunning ? t("servers.onlineBadge", "EN LÍNEA (Online)") : t("servers.offlineBadge", "DETENIDO (Offline)")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="dark:text-slate-400 text-slate-500">
                  {t("servers.baseUrl", "URL Base:")}
                </span>
                <span className="text-blue-600 dark:text-blue-400 font-mono font-medium">
                  http://localhost:{port}/
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "advanced" && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold dark:text-white text-slate-900">
              {t("servers.advancedConfig", "Configuración avanzada")}
            </h4>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoStart}
                  onChange={(e) => setAutoStart(e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs dark:text-slate-200 text-slate-700">
                  {t("servers.autostartCheckbox", "Iniciar este servidor automáticamente al arrancar Kyrnex")}
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked={true}
                  className="rounded border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs dark:text-slate-200 text-slate-700">
                  {t("servers.fallbackPortCheckbox", "Fallback automático si el puerto está ocupado")}
                </span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons Footer */}
      <div className="px-6 py-4 dark:bg-[#0d1422] bg-slate-50 border-t dark:border-kyrn-border/80 border-slate-200 flex items-center justify-end gap-3">
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold dark:text-slate-400 text-slate-600 hover:dark:text-white hover:text-slate-900 hover:dark:bg-slate-800/80 hover:bg-slate-200 border dark:border-slate-700/60 border-slate-300 transition-colors"
        >
          <X size={14} />
          <span>{t("common.cancel", "Cancelar")}</span>
        </button>

        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-semibold bg-kyrn-blue hover:bg-blue-600 text-white shadow-glow transition-all active:scale-[0.98]"
        >
          <Save size={14} />
          <span>{t("servers.saveChanges", "Guardar cambios")}</span>
        </button>
      </div>
    </div>
  );
}

export default ServerDetailTabs;
