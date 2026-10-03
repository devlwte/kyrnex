import React from "react";
import { Folder, FolderOpen, FileCode } from "lucide-react";
import { useTranslation } from "../../context/I18nContext";

export function FilesView({ selectedServer }) {
  const { t } = useTranslation();

  if (!selectedServer) {
    return (
      <div className="p-8 text-center dark:text-slate-500 text-slate-400 text-xs">
        {t("files.noServerSelected", "No hay ningún servidor seleccionado para explorar sus archivos.")}
      </div>
    );
  }

  const handleOpenFolder = () => {
    window.kyrnexAPI?.system?.openPath(selectedServer.rootDir);
  };

  const handleOpenPublicFolder = () => {
    const fullPath = `${selectedServer.rootDir}/${selectedServer.publicDir || ""}`;
    window.kyrnexAPI?.system?.openPath(fullPath);
  };

  return (
    <div className="w-full space-y-6 select-none min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-bold dark:text-white text-slate-900 truncate">
            {t("files.explorerTitle", "Explorador de Archivos")}: {selectedServer.name}
          </h3>
          <p className="text-xs dark:text-slate-400 text-slate-500 truncate">
            {t("files.location", "Ubicación:")} <span className="font-mono text-blue-600 dark:text-blue-400">{selectedServer.rootDir}</span>
          </p>
        </div>

        <button
          onClick={handleOpenFolder}
          className="flex items-center justify-center gap-2 dark:bg-[#172338] bg-blue-50 hover:dark:bg-[#1e2f4c] hover:bg-blue-100 text-blue-700 dark:text-blue-300 px-3.5 py-2 rounded-lg text-xs font-semibold border border-blue-200 dark:border-blue-500/30 transition-colors shadow-sm flex-shrink-0"
        >
          <FolderOpen size={16} />
          <span>{t("files.openInWindows", "Abrir en Windows")}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Carpeta raíz */}
        <div className="dark:bg-kyrn-card bg-white border dark:border-kyrn-border border-slate-200 rounded-xl p-5 space-y-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600/20 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Folder size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold dark:text-white text-slate-900">
                {t("files.rootDirTitle", "Directorio Raíz del Proyecto")}
              </h4>
              <p className="text-[11px] dark:text-slate-400 text-slate-600 font-mono truncate max-w-sm">
                {selectedServer.rootDir}
              </p>
            </div>
          </div>
          <button
            onClick={handleOpenFolder}
            className="w-full text-center py-2 text-xs dark:bg-kyrn-input bg-slate-50 hover:dark:bg-slate-800 hover:bg-slate-100 dark:text-slate-300 text-slate-700 rounded-lg border dark:border-kyrn-border border-slate-200"
          >
            {t("files.viewContentInWindows", "Ver contenido en Windows")}
          </button>
        </div>

        {/* Carpeta pública */}
        <div className="dark:bg-kyrn-card bg-white border dark:border-kyrn-border border-slate-200 rounded-xl p-5 space-y-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <span className="text-base">📁</span>
            </div>
            <div>
              <h4 className="text-xs font-bold dark:text-white text-slate-900">
                {t("files.publicFolderTitle", "Carpeta Pública / Estática")}
              </h4>
              <p className="text-[11px] dark:text-slate-400 text-slate-600 font-mono">
                {selectedServer.publicDir ? `/${selectedServer.publicDir}` : `/ ${t("files.rootDirectoryLabel", "(Directorio raíz)")}`}
              </p>
            </div>
          </div>
          <button
            onClick={handleOpenPublicFolder}
            className="w-full text-center py-2 text-xs dark:bg-kyrn-input bg-slate-50 hover:dark:bg-slate-800 hover:bg-slate-100 dark:text-slate-300 text-slate-700 rounded-lg border dark:border-kyrn-border border-slate-200"
          >
            {t("files.openPublicFolder", "Abrir carpeta pública")}
          </button>
        </div>
      </div>

      {/* Archivo principal */}
      <div className="dark:bg-kyrn-card bg-white border dark:border-kyrn-border border-slate-200 rounded-xl p-5 space-y-2 shadow-sm">
        <h4 className="text-xs font-bold dark:text-white text-slate-900 flex items-center gap-2">
          <FileCode size={16} className="text-amber-500" />
          <span>{t("files.mainFileTitle", "Archivo Principal de Entrada")}</span>
        </h4>
        <p className="text-xs dark:text-slate-300 text-slate-700 font-mono">
          {selectedServer.mainFile}
        </p>
        <p className="text-[11px] dark:text-slate-500 text-slate-400">
          {t("files.mainFileDesc", "Este archivo actúa como punto de inicio o archivo de rutas para Express.")}
        </p>
      </div>
    </div>
  );
}

export default FilesView;
