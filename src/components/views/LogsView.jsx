import React, { useState } from "react";
import { Trash2, Search } from "lucide-react";
import { useTranslation } from "../../context/I18nContext";

export function LogsView({ logs = [], onClearLogs }) {
  const { t } = useTranslation();
  const [filterLevel, setFilterLevel] = useState("ALL");
  const [search, setSearch] = useState("");

  const filteredLogs = logs.filter((log) => {
    if (filterLevel !== "ALL" && log.level !== filterLevel) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        log.message.toLowerCase().includes(q) ||
        log.scope.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getLevelBadge = (level) => {
    switch (level) {
      case "ERROR":
        return "dark:bg-red-950/60 bg-red-100 text-red-600 dark:text-red-400 border dark:border-red-800/40 border-red-300";
      case "WARN":
        return "dark:bg-amber-950/60 bg-amber-100 text-amber-600 dark:text-amber-400 border dark:border-amber-800/40 border-amber-300";
      case "SUCCESS":
        return "dark:bg-emerald-950/60 bg-emerald-100 text-emerald-600 dark:text-emerald-400 border dark:border-emerald-800/40 border-emerald-300";
      case "DEBUG":
        return "dark:bg-slate-800 bg-slate-200 dark:text-slate-400 text-slate-600 border dark:border-slate-700/50 border-slate-300";
      default:
        return "dark:bg-cyan-950/60 bg-cyan-100 text-cyan-700 dark:text-cyan-400 border dark:border-cyan-800/40 border-cyan-300";
    }
  };

  return (
    <div className="w-full space-y-4 h-full flex flex-col select-none min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-bold dark:text-white text-slate-900 truncate">
            {t("logs.consoleTitle", "Consola de Registros en Vivo")}
          </h3>
          <p className="text-xs dark:text-slate-400 text-slate-500 truncate">
            {t("logs.consoleSubtitle", "Monitoreo en streaming de eventos del sistema y servidores Express")}
          </p>
        </div>

        <button
          onClick={onClearLogs}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 dark:bg-red-950/40 bg-red-50 hover:dark:bg-red-900/50 hover:bg-red-100 text-red-600 dark:text-red-400 border dark:border-red-800/40 border-red-200 text-xs font-semibold rounded-lg transition-colors flex-shrink-0"
        >
          <Trash2 size={13} />
          <span>{t("logs.clearLogs", "Limpiar registros")}</span>
        </button>
      </div>

      {/* Toolbar Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
        <div className="relative flex-1 min-w-0">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t("logs.filterPlaceholder", "Filtrar por texto o módulo...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full dark:bg-kyrn-card bg-white border dark:border-kyrn-border border-slate-300 rounded-lg pl-9 pr-3 py-1.5 text-xs dark:text-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-kyrn-blue"
          />
        </div>

        <div className="flex items-center gap-1 dark:bg-kyrn-card bg-white border dark:border-kyrn-border border-slate-200 rounded-lg p-1 text-xs shadow-sm overflow-x-auto horizontal-scroll flex-shrink-0">
          {["ALL", "INFO", "SUCCESS", "WARN", "ERROR"].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilterLevel(lvl)}
              className={`px-2 py-0.5 rounded font-medium transition-colors text-[11px] whitespace-nowrap ${
                filterLevel === lvl
                  ? "bg-kyrn-blue text-white"
                  : "dark:text-slate-400 text-slate-600 hover:dark:text-white hover:text-slate-900"
              }`}
            >
              {lvl === "ALL" ? t("logs.filterAll", "Todos") : lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Terminal Output */}
      <div className="flex-1 dark:bg-[#060a12] bg-slate-950 border dark:border-kyrn-border border-slate-800 rounded-xl p-4 overflow-y-auto font-mono text-xs space-y-2 shadow-inner">
        {filteredLogs.length > 0 ? (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-3 py-1 px-2 rounded hover:bg-slate-900/60 transition-colors"
            >
              <span className="text-slate-500 flex-shrink-0">[{log.timeFormatted}]</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider flex-shrink-0 ${getLevelBadge(
                  log.level
                )}`}
              >
                {log.level}
              </span>
              <span className="text-blue-400 font-semibold flex-shrink-0">
                [{log.scope}]
              </span>
              <span className="text-slate-200 break-all">{log.message}</span>
            </div>
          ))
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500 text-xs">
            {t("logs.noLogsFiltered", "No hay registros para mostrar con los filtros actuales.")}
          </div>
        )}
      </div>
    </div>
  );
}

export default LogsView;
