import React, { useState, useRef, useEffect } from "react";
import {
  Folder,
  Globe,
  MoreVertical,
  Play,
  Square,
  RotateCw,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { useTranslation } from "../../context/I18nContext";

export function ServerCard({
  server,
  isSelected,
  onSelect,
  onStart,
  onStop,
  onRestart,
  onDelete,
}) {
  const { t } = useTranslation();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  const isRunning = server.status === "running";

  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  const handleOpenExternal = (e) => {
    e.stopPropagation();
    const url = `http://localhost:${server.port}`;
    window.kyrnexAPI?.system?.openExternal(url);
  };

  return (
    <div
      onClick={onSelect}
      className={`relative min-w-[290px] max-w-[320px] rounded-xl p-4 cursor-pointer transition-all duration-200 border ${
        isSelected
          ? "dark:bg-[#131d2e] bg-blue-50/70 border-blue-500 shadow-cardGlow ring-1 ring-blue-500/50"
          : "dark:bg-kyrn-card bg-white dark:border-kyrn-border border-slate-200 hover:dark:border-slate-700 hover:border-slate-300 hover:dark:bg-[#131b2a] hover:bg-slate-50/80 shadow-sm"
      }`}
    >
      {/* Top Header: Indicator + Title + Badge + Actions */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
              isRunning
                ? "bg-emerald-400 shadow-emeraldGlow"
                : server.status === "error"
                ? "bg-red-500"
                : "bg-slate-400 dark:bg-slate-500"
            }`}
          />
          <h3
            className="text-xs font-semibold dark:text-white text-slate-800 truncate max-w-[130px]"
            title={server.name}
          >
            {server.name}
          </h3>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              isRunning
                ? "dark:bg-emerald-950/60 bg-emerald-100 text-emerald-700 dark:text-emerald-400 border dark:border-emerald-800/40 border-emerald-300"
                : "dark:bg-slate-800 bg-slate-100 dark:text-slate-400 text-slate-600 border dark:border-slate-700/50 border-slate-200"
            }`}
          >
            {isRunning ? t("common.active", "Activo") : t("common.inactive", "Detenido")}
          </span>
        </div>

        {/* Action Menu Button */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 rounded dark:text-slate-400 text-slate-500 hover:dark:text-white hover:text-slate-900 hover:dark:bg-slate-800 hover:bg-slate-100 transition-colors"
          >
            <MoreVertical size={15} />
          </button>

          {showMenu && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-6 w-36 dark:bg-[#0e1422] bg-white border dark:border-kyrn-border border-slate-200 rounded-lg shadow-2xl py-1 z-30 text-xs"
            >
              {isRunning ? (
                <>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onStop(server.id);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 dark:text-slate-300 text-slate-700 hover:dark:text-white hover:text-slate-900 hover:dark:bg-slate-800 hover:bg-slate-100"
                  >
                    <Square size={13} className="text-amber-500" /> {t("servers.stop", "Detener")}
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onRestart(server.id);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 dark:text-slate-300 text-slate-700 hover:dark:text-white hover:text-slate-900 hover:dark:bg-slate-800 hover:bg-slate-100"
                  >
                    <RotateCw size={13} className="text-blue-500" /> {t("servers.restart", "Reiniciar")}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onStart(server.id);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 dark:text-slate-300 text-slate-700 hover:dark:text-white hover:text-slate-900 hover:dark:bg-slate-800 hover:bg-slate-100"
                >
                  <Play size={13} className="text-emerald-500" /> {t("servers.start", "Iniciar")}
                </button>
              )}
              <button
                onClick={() => {
                  setShowMenu(false);
                  onDelete(server.id);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-red-500 hover:dark:bg-red-950/40 hover:bg-red-50 border-t dark:border-kyrn-border/50 border-slate-100 mt-1"
              >
                <Trash2 size={13} /> {t("common.delete", "Eliminar")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Server Info Rows */}
      <div className="space-y-1.5 text-[11px] dark:text-slate-400 text-slate-600">
        <div className="flex items-center gap-2">
          <Folder size={13} className="text-slate-400 flex-shrink-0" />
          <span>
            {t("servers.port", "Puerto")}:{" "}
            <strong className="dark:text-slate-200 text-slate-800 font-semibold">
              {server.port}
            </strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-mono text-[10px]">📁</span>
          <span className="truncate max-w-[230px]" title={server.rootDir}>
            {server.rootDir}
          </span>
        </div>

        <div className="flex items-center gap-2 pt-0.5">
          <Globe size={13} className="text-blue-500 dark:text-blue-400 flex-shrink-0" />
          <button
            onClick={handleOpenExternal}
            className="text-blue-600 dark:text-blue-400 hover:underline truncate max-w-[210px] text-left flex items-center gap-1 font-medium"
          >
            <span>http://localhost:{server.port}</span>
            <ExternalLink size={11} className="opacity-70" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default ServerCard;
