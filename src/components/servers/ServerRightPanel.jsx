import React, { useState } from "react";
import {
  Users,
  Cpu,
  HardDrive,
  ExternalLink,
  Copy,
  Check,
  RotateCw,
  Globe,
  Radio,
} from "lucide-react";
import { useTranslation } from "../../context/I18nContext";

export function ServerRightPanel({
  server,
  metrics,
  previewImage,
  onRefreshPreview,
  isRefreshingPreview,
  logs = [],
  onViewAllLogs,
}) {
  const { t, defaultIconPng } = useTranslation();
  const [copied, setCopied] = useState(false);

  if (!server) {
    return (
      <div className="w-full dark:bg-kyrn-card bg-white border dark:border-kyrn-border border-slate-200 rounded-xl p-6 text-xs text-slate-400 flex items-center justify-center">
        {t("servers.noServerSelected", "Sin servidor seleccionado")}
      </div>
    );
  }

  const isRunning = server.status === "running";
  const url = `http://localhost:${server.port}`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenExternal = () => {
    window.kyrnexAPI?.system?.openExternal(url);
  };

  // Color mapping for logs
  const getLogDotColor = (level, message = "") => {
    if (level === "ERROR" || message.includes("Error") || message.includes("Puerto")) {
      return "bg-red-500";
    }
    if (level === "SUCCESS" || message.includes("iniciado") || message.includes("activo")) {
      return "bg-emerald-500 shadow-emeraldGlow";
    }
    if (message.includes("Cargando") || level === "INFO") {
      return "bg-cyan-500";
    }
    return "bg-blue-500";
  };

  return (
    <div className="w-full max-w-full flex flex-col gap-4 select-none">
      {/* 1. Estado del servidor y Métricas */}
      <div className="dark:bg-kyrn-card bg-white border dark:border-kyrn-border border-slate-200 rounded-xl p-4 space-y-3 shadow-sm transition-colors duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio
              size={14}
              className={isRunning ? "text-emerald-500 animate-pulse" : "text-slate-400"}
            />
            <h4 className="text-xs font-bold dark:text-white text-slate-900">
              {t("servers.serverStatus", "Estado del servidor")}
            </h4>
          </div>
          <button
            onClick={handleOpenExternal}
            className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40 transition-colors"
          >
            <span>{t("servers.openPreview", "Abrir previo")}</span>
            <ExternalLink size={11} />
          </button>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          {/* Conexiones */}
          <div className="dark:bg-kyrn-input bg-slate-50 border dark:border-kyrn-border border-slate-200 rounded-lg p-2.5 flex flex-col justify-between">
            <Users size={16} className="dark:text-slate-400 text-slate-500 mb-2" />
            <div>
              <p className="text-xs font-bold dark:text-white text-slate-900">
                {isRunning ? metrics?.connections || 0 : 0}
              </p>
              <p className="text-[10px] dark:text-slate-400 text-slate-500">
                {t("servers.connections", "Conexiones")}
              </p>
            </div>
          </div>

          {/* Memoria */}
          <div className="dark:bg-kyrn-input bg-slate-50 border dark:border-kyrn-border border-slate-200 rounded-lg p-2.5 flex flex-col justify-between">
            <HardDrive size={16} className="text-blue-500 mb-2" />
            <div>
              <p className="text-xs font-bold dark:text-white text-slate-900">
                {isRunning ? `${metrics?.memoryMb || 12} MB` : "0 MB"}
              </p>
              <p className="text-[10px] dark:text-slate-400 text-slate-500">
                {t("servers.memory", "Memoria")}
              </p>
            </div>
          </div>

          {/* CPU */}
          <div className="dark:bg-kyrn-input bg-slate-50 border dark:border-kyrn-border border-slate-200 rounded-lg p-2.5 flex flex-col justify-between">
            <Cpu size={16} className="text-emerald-500 mb-2" />
            <div>
              <p className="text-xs font-bold dark:text-white text-slate-900">
                {isRunning ? `${metrics?.cpu || 0.2}%` : "0%"}
              </p>
              <p className="text-[10px] dark:text-slate-400 text-slate-500">
                {t("servers.cpu", "CPU")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. URL de acceso */}
      <div className="dark:bg-kyrn-card bg-white border dark:border-kyrn-border border-slate-200 rounded-xl p-4 space-y-2 shadow-sm transition-colors duration-200">
        <h4 className="text-xs font-bold dark:text-white text-slate-900 flex items-center gap-1.5">
          <Globe size={13} className="text-blue-500" />
          <span>{t("servers.accessUrl", "URL de acceso")}</span>
        </h4>
        <div className="flex items-center justify-between dark:bg-kyrn-input bg-slate-50 border dark:border-kyrn-border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-blue-600 dark:text-blue-400">
          <span className="truncate max-w-[210px]">{url}</span>
          <button
            onClick={handleCopyUrl}
            title={t("servers.copyUrl", "Copiar URL")}
            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          </button>
        </div>
      </div>

      {/* 3. Vista previa con Imagen, Caché y Botón de Recarga */}
      <div className="dark:bg-kyrn-card bg-white border dark:border-kyrn-border border-slate-200 rounded-xl p-4 space-y-2.5 shadow-sm transition-colors duration-200">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold dark:text-white text-slate-900">
            {t("servers.preview", "Vista previa")}
          </h4>
          <button
            onClick={handleOpenExternal}
            className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium transition-colors"
          >
            <span>{t("servers.openBrowser", "Abrir en navegador")}</span>
            <ExternalLink size={11} />
          </button>
        </div>

        {/* Mock Browser Container */}
        <div className="rounded-lg overflow-hidden border dark:border-kyrn-border border-slate-200 bg-slate-50 dark:bg-[#090d16] flex flex-col shadow-md">
          {/* Mini Browser Bar */}
          <div className="dark:bg-[#121927] bg-slate-100 px-3 py-1.5 border-b dark:border-kyrn-border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-400"></span>
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            </div>

            <div className="dark:bg-[#090d16] bg-white border dark:border-kyrn-border/60 border-slate-300 rounded px-2.5 py-0.5 text-[10px] dark:text-slate-300 text-slate-700 font-mono flex items-center gap-1.5 max-w-[150px] truncate">
              <span className="text-slate-400">🔒</span>
              <span className="truncate">localhost:{server.port}</span>
            </div>

            {/* Reload Preview Button */}
            <button
              onClick={onRefreshPreview}
              disabled={isRefreshingPreview || !isRunning}
              title={t("servers.refreshPreviewTitle", "Recargar vista previa (Captura en caliente)")}
              className={`p-1 rounded text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700/60 transition-colors ${
                isRefreshingPreview ? "animate-spin text-blue-500" : ""
              } ${!isRunning ? "opacity-30 cursor-not-allowed" : ""}`}
            >
              <RotateCw size={12} />
            </button>
          </div>

          {/* Browser Screen Content (Image Preview with caching) */}
          <div className="h-36 relative dark:bg-gradient-to-br dark:from-slate-900 dark:via-[#0d1627] dark:to-[#070b13] bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 flex items-center justify-center overflow-hidden">
            {previewImage ? (
              <img
                src={previewImage}
                alt="Vista previa"
                className="w-full h-full object-cover object-top transition-opacity duration-300"
              />
            ) : isRunning ? (
              <div className="p-4 text-center space-y-1.5">
                <img
                  src={defaultIconPng}
                  alt="Kyrnex"
                  className="w-8 h-8 rounded-lg mx-auto object-contain shadow-glow"
                />
                <p className="text-[11px] font-semibold dark:text-white text-slate-800">
                  KYRNEX
                </p>
                <p className="text-[9px] dark:text-slate-400 text-slate-500">
                  {t("servers.clickToCapture", "Haz clic en el icono ↻ para capturar la portada")}
                </p>
              </div>
            ) : (
              <div className="text-center p-4">
                <span className="text-slate-400 text-2xl block mb-1">💤</span>
                <p className="text-[11px] dark:text-slate-400 text-slate-500">
                  {t("servers.serverStopped", "Servidor detenido")}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Registros recientes */}
      <div className="dark:bg-kyrn-card bg-white border dark:border-kyrn-border border-slate-200 rounded-xl p-4 space-y-2 flex-1 flex flex-col shadow-sm transition-colors duration-200">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold dark:text-white text-slate-900">
            {t("servers.recentLogs", "Registros recientes")}
          </h4>
          <button
            onClick={onViewAllLogs}
            className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium transition-colors"
          >
            {t("servers.viewAllLogs", "Ver todos")}
          </button>
        </div>

        <div className="space-y-2 overflow-y-auto max-h-[140px] pr-1">
          {logs && logs.length > 0 ? (
            logs.slice(-4).reverse().map((log) => (
              <div key={log.id} className="flex items-start gap-2 text-[11px] font-mono">
                <span
                  className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${getLogDotColor(
                    log.level,
                    log.message
                  )}`}
                />
                <span className="dark:text-slate-400 text-slate-500 flex-shrink-0">
                  {log.timeFormatted}
                </span>
                <span
                  className="dark:text-slate-200 text-slate-800 truncate"
                  title={log.message}
                >
                  {log.message}
                </span>
              </div>
            ))
          ) : (
            <p className="text-[11px] dark:text-slate-500 text-slate-400">
              {t("servers.noRecentEvents", "Sin eventos recientes.")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ServerRightPanel;
