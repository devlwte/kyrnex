import React, { useState } from "react";
import { X, Folder, Search, Server, Plus, FileCode } from "lucide-react";
import { useTranslation } from "../../context/I18nContext";

export function NewServerModal({ isOpen, onClose, onCreate }) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [port, setPort] = useState(3050);
  const [rootDir, setRootDir] = useState("");
  const [publicDir, setPublicDir] = useState("public");
  const [viewsDir, setViewsDir] = useState("views");
  const [mainFile, setMainFile] = useState("index.html");
  const [autoStart, setAutoStart] = useState(true);

  if (!isOpen) return null;

  const handleBrowse = async () => {
    const selected = await window.kyrnexAPI?.dialogs?.selectDirectory();
    if (selected) {
      setRootDir(selected);
      if (!name) {
        // Auto-assign folder name as server name
        const folderName = selected.split(/[\\/]/).pop();
        setName(folderName || "Nuevo Servidor");
      }
    }
  };

  const handleBrowseMainFile = async () => {
    const selected = await window.kyrnexAPI?.dialogs?.selectFile();
    if (selected) {
      const fileName = selected.split(/[\\/]/).pop();
      setMainFile(fileName || selected);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    onCreate({
      name: name.trim(),
      port: parseInt(port, 10) || 3000,
      rootDir: rootDir.trim() || process.cwd(),
      publicDir: publicDir.trim(),
      viewsDir: viewsDir.trim(),
      mainFile: mainFile.trim() || "index.html",
      autoStart,
      type: "static",
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="dark:bg-[#0f172a] bg-white border dark:border-kyrn-border border-slate-200 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden transition-colors">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b dark:border-kyrn-border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Server size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold dark:text-white text-slate-900">
                {t("modals.newServerTitle", "Nuevo Servidor Express")}
              </h3>
              <p className="text-[11px] dark:text-slate-400 text-slate-500">
                {t("modals.newServerSubtitle", "Crea y lanza un nuevo entorno local independiente")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded dark:text-slate-400 text-slate-500 hover:dark:text-white hover:text-slate-900 hover:dark:bg-slate-800 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold dark:text-slate-300 text-slate-700">
              {t("modals.serverName", "Nombre del servidor *")}
            </label>
            <input
              type="text"
              required
              placeholder={t("modals.serverNamePlaceholder", "Ej. Mi Proyecto Web")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full dark:bg-kyrn-input bg-slate-50 border dark:border-kyrn-border border-slate-300 rounded-lg px-3.5 py-2 text-xs dark:text-white text-slate-900 focus:outline-none focus:border-kyrn-blue"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] gap-3">
            <div className="space-y-1.5 min-w-0">
              <label className="text-[11px] font-semibold dark:text-slate-300 text-slate-700">
                {t("modals.basePort", "Puerto base *")}
              </label>
              <input
                type="number"
                required
                min={1024}
                max={65535}
                value={port}
                onChange={(e) => setPort(e.target.value)}
                className="w-full dark:bg-kyrn-input bg-slate-50 border dark:border-kyrn-border border-slate-300 rounded-lg px-3 py-2 text-xs dark:text-white text-slate-900 focus:outline-none focus:border-kyrn-blue font-mono"
              />
            </div>

            <div className="space-y-1.5 min-w-0">
              <label className="text-[11px] font-semibold dark:text-slate-300 text-slate-700">
                {t("modals.mainFile", "Archivo principal")}
              </label>
              <div className="flex items-center gap-2 min-w-0">
                <input
                  type="text"
                  value={mainFile}
                  onChange={(e) => setMainFile(e.target.value)}
                  placeholder="index.html"
                  className="flex-1 min-w-0 dark:bg-kyrn-input bg-slate-50 border dark:border-kyrn-border border-slate-300 rounded-lg px-3 py-2 text-xs dark:text-white text-slate-900 focus:outline-none focus:border-kyrn-blue font-mono"
                />
                <button
                  type="button"
                  onClick={handleBrowseMainFile}
                  title="Examinar archivo"
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 hover:dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-700 transition-colors flex-shrink-0"
                >
                  <FileCode size={14} className="flex-shrink-0" />
                  <span>{t("common.browse", "Explorar")}</span>
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-1 pt-1">
                {["index.html", "server.js", "app.js", "main.mjs", "api.js"].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setMainFile(p)}
                    className={`text-[10px] px-2 py-0.5 rounded font-mono transition-colors ${
                      mainFile === p
                        ? "bg-blue-600 text-white font-semibold"
                        : "dark:bg-slate-800 bg-slate-100 dark:text-slate-300 text-slate-700 hover:dark:bg-slate-700 hover:bg-slate-200 border dark:border-slate-700 border-slate-300"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1.5 min-w-0">
            <label className="text-[11px] font-semibold dark:text-slate-300 text-slate-700">
              {t("modals.projectRootDir", "Carpeta raíz del proyecto")}
            </label>
            <div className="flex items-center gap-2 min-w-0">
              <div className="relative flex-1 min-w-0">
                <Folder size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={t("modals.selectFolderPlaceholder", "Seleccionar carpeta...")}
                  value={rootDir}
                  onChange={(e) => setRootDir(e.target.value)}
                  className="w-full dark:bg-kyrn-input bg-slate-50 border dark:border-kyrn-border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs dark:text-white text-slate-900 focus:outline-none focus:border-kyrn-blue font-mono"
                />
              </div>
              <button
                type="button"
                onClick={handleBrowse}
                className="flex items-center gap-1.5 dark:bg-[#1b263b] bg-blue-50 hover:dark:bg-[#23334f] hover:bg-blue-100 dark:text-blue-300 text-blue-700 px-3 py-2 rounded-lg text-xs font-medium border dark:border-blue-500/30 border-blue-200 flex-shrink-0"
              >
                <Search size={13} className="flex-shrink-0" />
                <span>{t("modals.browse", "Buscar")}</span>
              </button>
            </div>
          </div>

          {/* Carpetas Pública y de Vistas (EJS) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Carpeta pública */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold dark:text-slate-300 text-slate-700">
                  {t("modals.publicFolder", "Carpeta pública")}
                </label>
                {publicDir ? (
                  <button
                    type="button"
                    onClick={() => setPublicDir("")}
                    className="text-[10px] text-blue-500 hover:text-blue-600 dark:text-blue-400 font-medium hover:underline"
                  >
                    {t("modals.useRoot", "Usar raíz (\"\")")}
                  </button>
                ) : (
                  <span className="text-[10px] text-emerald-500 font-medium">
                    {t("modals.inRoot", "✓ En la raíz")}
                  </span>
                )}
              </div>
              <input
                type="text"
                placeholder={t("modals.publicFolderPlaceholder", "public (vacío = raíz)")}
                value={publicDir}
                onChange={(e) => setPublicDir(e.target.value)}
                className="w-full dark:bg-kyrn-input bg-slate-50 border dark:border-kyrn-border border-slate-300 rounded-lg px-3 py-2 text-xs dark:text-white text-slate-900 focus:outline-none focus:border-kyrn-blue font-mono"
              />
              <p className="text-[10px] dark:text-slate-400 text-slate-500">
                {publicDir
                  ? t("modals.publicFolderDesc", "Archivos estáticos desde esta subcarpeta.")
                  : t("modals.publicFolderRootDesc", "Archivos servidos directo desde la raíz.")}
              </p>
            </div>

            {/* Carpeta vistas (EJS) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold dark:text-slate-300 text-slate-700">
                  {t("modals.viewsFolder", "Carpeta vistas (EJS)")}
                </label>
                {viewsDir ? (
                  <button
                    type="button"
                    onClick={() => setViewsDir("")}
                    className="text-[10px] text-blue-500 hover:text-blue-600 dark:text-blue-400 font-medium hover:underline"
                  >
                    {t("modals.useRoot", "Usar raíz (\"\")")}
                  </button>
                ) : (
                  <span className="text-[10px] text-emerald-500 font-medium">
                    {t("modals.inRoot", "✓ En la raíz")}
                  </span>
                )}
              </div>
              <input
                type="text"
                placeholder={t("modals.viewsFolderPlaceholder", "views (vacío = raíz)")}
                value={viewsDir}
                onChange={(e) => setViewsDir(e.target.value)}
                className="w-full dark:bg-kyrn-input bg-slate-50 border dark:border-kyrn-border border-slate-300 rounded-lg px-3 py-2 text-xs dark:text-white text-slate-900 focus:outline-none focus:border-kyrn-blue font-mono"
              />
              <p className="text-[10px] dark:text-slate-400 text-slate-500">
                {viewsDir
                  ? t("modals.viewsFolderDesc", "Plantillas EJS desde esta subcarpeta.")
                  : t("modals.viewsFolderRootDesc", "Plantillas buscadas directo en la raíz.")}
              </p>
            </div>
          </div>

          <label className="flex items-center gap-2 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={autoStart}
              onChange={(e) => setAutoStart(e.target.checked)}
              className="rounded bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs dark:text-slate-300 text-slate-700">
              {t("modals.autoStartImmediate", "Iniciar servidor inmediatamente al crear")}
            </span>
          </label>

          {/* Buttons */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t dark:border-kyrn-border border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs dark:text-slate-400 text-slate-600 hover:dark:text-white hover:text-slate-900 rounded-lg border dark:border-slate-700 border-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {t("modals.cancel", "Cancelar")}
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold bg-kyrn-blue hover:bg-blue-600 text-white rounded-lg shadow-glow"
            >
              <Plus size={15} />
              <span>{t("modals.createServer", "Crear servidor")}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NewServerModal;
