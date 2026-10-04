import React, { useState, useEffect } from "react";
import {
  RefreshCw,
  Check,
  Sun,
  Moon,
  Bell,
  Globe,
  Save,
  Trash2,
  FileCode,
  Sparkles,
  ArrowDownCircle,
  DownloadCloud,
  RotateCcw,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { notificationManager } from "../../services/notificationManager";
import { useTranslation } from "../../context/I18nContext";

export function SettingsView({ theme, toggleTheme, onCheckRemote, isCheckingRemote, addNotification }) {
  const { t, language, setLanguage, supportedLanguages, appConfig, defaultIconPng } = useTranslation();
  const [defaultPort, setDefaultPort] = useState(3000);
  const [autoStartWindows, setAutoStartWindows] = useState(() => {
    try {
      return localStorage.getItem("kyrnex_auto_start_windows") === "true";
    } catch {
      return false;
    }
  });
  const [cleared, setCleared] = useState(false);
  const [feedUrl, setFeedUrl] = useState(() => notificationManager.getRemoteFeedUrl());
  const [savedFeed, setSavedFeed] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  // Updater state
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [updateFeedUrl, setUpdateFeedUrl] = useState(
    "https://raw.githubusercontent.com/devlwte/kyrnex/refs/heads/main/updates/version_kyrnex.json"
  );
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isInstallingUpdate, setIsInstallingUpdate] = useState(false);
  const [updateResult, setUpdateResult] = useState(null);
  const [updateFeedSaved, setUpdateFeedSaved] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);
  const [installError, setInstallError] = useState(null);

  // Load initial settings (updater and Windows autoStart)
  useEffect(() => {
    async function loadInitialSettings() {
      try {
        const cfg = await window.kyrnexAPI?.updater?.getConfig();
        if (cfg) {
          setAutoUpdate(Boolean(cfg.autoCheck));
          if (cfg.feedUrl) setUpdateFeedUrl(cfg.feedUrl);
        }
      } catch (err) {
        console.warn("Could not load updater config:", err);
      }

      if (window.kyrnexAPI?.system?.getAutoStart) {
        try {
          const isAutoStart = await window.kyrnexAPI.system.getAutoStart();
          setAutoStartWindows(Boolean(isAutoStart));
          try {
            localStorage.setItem("kyrnex_auto_start_windows", String(Boolean(isAutoStart)));
          } catch {}
        } catch (err) {
          console.warn("Could not get login item settings:", err);
        }
      }
    }
    loadInitialSettings();
  }, []);

  const handleToggleAutoStart = async (checked) => {
    setAutoStartWindows(checked);
    try {
      localStorage.setItem("kyrnex_auto_start_windows", String(checked));
    } catch {}

    if (window.kyrnexAPI?.system?.setAutoStart) {
      try {
        await window.kyrnexAPI.system.setAutoStart(checked);
        addNotification?.({
          title: checked
            ? t("settings.autoStartEnabledTitle", "Inicio con el sistema activado")
            : t("settings.autoStartDisabledTitle", "Inicio con el sistema desactivado"),
          message: checked
            ? t("settings.autoStartEnabledDesc", "Kyrnex se iniciará automáticamente al encender Windows.")
            : t("settings.autoStartDisabledDesc", "Kyrnex ya no se iniciará automáticamente al encender el equipo."),
          type: "info",
        });
      } catch (err) {
        console.error("Error setting auto start:", err);
      }
    }
  };

  const handleToggleAutoUpdate = async (checked) => {
    setAutoUpdate(checked);
    await window.kyrnexAPI?.updater?.saveConfig({
      autoCheck: checked,
      autoInstall: checked,
    });
  };

  const handleSaveUpdateFeed = async () => {
    await window.kyrnexAPI?.updater?.saveConfig({
      feedUrl: updateFeedUrl,
    });
    setUpdateFeedSaved(true);
    setTimeout(() => setUpdateFeedSaved(false), 2000);
  };

  const handleCheckUpdates = async () => {
    setIsCheckingUpdate(true);
    setInstallError(null);
    setInstallSuccess(false);
    try {
      const res = await window.kyrnexAPI?.updater?.checkForUpdates(updateFeedUrl);
      setUpdateResult(res);

      if (res && res.hasUpdate) {
        addNotification?.({
          title: `¡Nueva versión v${res.latestVersion} disponible!`,
          message: res.changelog || "Hay una nueva actualización disponible en GitHub.",
          type: "info",
        });

        // If auto-update is active, proceed to download and install automatically
        if (autoUpdate) {
          setIsInstallingUpdate(true);
          const instRes = await window.kyrnexAPI?.updater?.installUpdate(res);
          if (instRes && instRes.success) {
            setInstallSuccess(true);
            addNotification?.({
              title: `¡Kyrnex v${res.latestVersion} instalado!`,
              message: "Actualización lista. Haz clic en 'Reiniciar Kyrnex ahora' para aplicar los cambios.",
              type: "success",
            });
          } else {
            setInstallError(instRes?.error || "Error al instalar actualización");
          }
          setIsInstallingUpdate(false);
        }
      } else if (res && !res.hasUpdate && !res.error) {
        addNotification?.({
          title: t("settings.upToDateTitle", "Sistema actualizado"),
          message: `${t("settings.upToDate", "Kyrnex está al día")} (v${res.currentVersion || "1.0.2"}).`,
          type: "success",
        });
      } else if (res && res.error) {
        addNotification?.({
          title: t("settings.updateErrorTitle", "Aviso del actualizador"),
          message: res.error,
          type: "warning",
        });
      }
    } catch (err) {
      setUpdateResult({ hasUpdate: false, error: err.message });
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleInstallUpdate = async () => {
    if (!updateResult) return;
    setIsInstallingUpdate(true);
    setInstallError(null);
    try {
      const res = await window.kyrnexAPI?.updater?.installUpdate(updateResult);
      if (res && res.success) {
        setInstallSuccess(true);
        addNotification?.({
          title: `¡Kyrnex v${updateResult.latestVersion} instalado!`,
          message: "Actualización lista. Haz clic en 'Reiniciar Kyrnex ahora' para aplicar los cambios.",
          type: "success",
        });
      } else {
        setInstallError(res?.error || "Error al instalar actualización");
      }
    } catch (err) {
      setInstallError(err.message);
    } finally {
      setIsInstallingUpdate(false);
    }
  };

  const handleRelaunch = () => {
    window.kyrnexAPI?.updater?.relaunch();
  };

  const handleClearCache = () => {
    setCleared(true);
    setTimeout(() => setCleared(false), 2000);
  };

  const handleSaveFeed = () => {
    notificationManager.setRemoteFeedUrl(feedUrl);
    setSavedFeed(true);
    setTimeout(() => setSavedFeed(false), 2000);
  };

  const handleResetProcessedIds = () => {
    notificationManager.resetProcessedIds();
    setResetDone(true);
    setTimeout(() => setResetDone(false), 2000);
  };

  return (
    <div className="w-full space-y-6 select-none min-w-0">
      <div>
        <h3 className="text-lg font-bold dark:text-white text-slate-900">
          {t("settings.title", "Configuración del Sistema")}
        </h3>
        <p className="text-xs dark:text-slate-400 text-slate-500">
          {t("settings.subtitle", "Personaliza el comportamiento general de la plataforma Kyrnex")}
        </p>
      </div>

      <div className="space-y-4">
        {/* 1. Selector de Idioma (Multi-Language i18n via JSON) */}
        <div className="dark:bg-kyrn-card bg-white border dark:border-kyrn-border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-blue-500" />
            <h4 className="text-xs font-bold dark:text-white text-slate-900 uppercase tracking-wider">
              {t("settings.languageSection", "Idioma de la Interfaz")}
            </h4>
          </div>

          <p className="text-[11px] dark:text-slate-400 text-slate-500">
            {t(
              "settings.languageDesc",
              "Selecciona el idioma del sistema. Todos los textos, títulos y avisos se actualizarán al instante."
            )}
          </p>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            {supportedLanguages.map((lang) => {
              const isCurrent = language === lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all duration-150 ${
                    isCurrent
                      ? "bg-kyrn-blue text-white border-kyrn-blue shadow-glow scale-[1.02]"
                      : "dark:bg-slate-800 bg-slate-100 dark:text-slate-300 text-slate-700 dark:border-slate-700 border-slate-300 hover:dark:bg-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <span className="text-base leading-none">{lang.flag}</span>
                  <span>{lang.name}</span>
                  {isCurrent && <Check size={14} className="ml-1 text-white" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Personalización por JSON & Iconos */}
        <div className="dark:bg-kyrn-card bg-white border dark:border-kyrn-border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCode size={16} className="text-indigo-400" />
              <h4 className="text-xs font-bold dark:text-white text-slate-900 uppercase tracking-wider">
                {t("settings.jsonConfigSection", "Personalización por JSON")}
              </h4>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full dark:bg-indigo-950/60 bg-indigo-50 border dark:border-indigo-800/50 border-indigo-200 text-indigo-400 text-[10px] font-semibold">
              <Sparkles size={11} />
              <span>Config-Driven</span>
            </div>
          </div>

          <p className="text-[11px] dark:text-slate-400 text-slate-500">
            {t(
              "settings.jsonConfigDesc",
              "Kyrnex está diseñado para ser totalmente configurable a través de archivos JSON locales sin tocar código:"
            )}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-lg dark:bg-[#0d131f] bg-slate-50 border dark:border-kyrn-border border-slate-200 flex items-start gap-3">
              <img
                src={appConfig?.branding?.iconPng || defaultIconPng}
                onError={(e) => {
                  if (e.currentTarget.src !== defaultIconPng) {
                    e.currentTarget.src = defaultIconPng;
                  }
                }}
                alt="Icon"
                className="w-10 h-10 object-contain rounded-xl shadow-glow flex-shrink-0 mt-0.5"
              />
              <div className="min-w-0">
                <p className="text-xs font-mono font-semibold text-blue-400 truncate">
                  src/config/app.config.json
                </p>
                <p className="text-[11px] dark:text-slate-400 text-slate-500 mt-1 leading-relaxed">
                  {t(
                    "settings.jsonConfigFile1",
                    "Nombres, subtítulo, versión e iconos oficiales."
                  )}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg dark:bg-[#0d131f] bg-slate-50 border dark:border-kyrn-border border-slate-200 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl dark:bg-slate-800 bg-slate-200 border dark:border-slate-700 border-slate-300 flex items-center justify-center text-xs font-mono font-bold dark:text-slate-300 text-slate-700 flex-shrink-0 mt-0.5">
                i18n
              </div>
              <div className="min-w-0">
                <p className="text-xs font-mono font-semibold text-emerald-400 truncate">
                  src/locales/&#123;lang&#125;.json
                </p>
                <p className="text-[11px] dark:text-slate-400 text-slate-500 mt-1 leading-relaxed">
                  {t(
                    "settings.jsonConfigFile2",
                    "Textos, menús, títulos y soporte para nuevos idiomas."
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Apariencia / Tema */}
        <div className="dark:bg-kyrn-card bg-white border dark:border-kyrn-border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4 shadow-sm">
          <h4 className="text-xs font-bold dark:text-white text-slate-900 uppercase tracking-wider">
            {t("settings.appearanceSection", "Apariencia y Tema")}
          </h4>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div>
              <p className="text-xs font-semibold dark:text-slate-200 text-slate-800">
                {t("settings.themeTitle", "Tema de la interfaz (Claro / Oscuro)")}
              </p>
              <p className="text-[11px] dark:text-slate-400 text-slate-500">
                {t(
                  "settings.themeDesc",
                  "Alterna entre el tema oscuro de alta inmersión o el tema claro limpio"
                )}
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex-shrink-0"
            >
              {theme === "dark" ? (
                <>
                  <Sun size={15} className="text-amber-400" />
                  <span>{t("settings.darkMode", "Modo Oscuro (Activo)")}</span>
                </>
              ) : (
                <>
                  <Moon size={15} className="text-slate-700" />
                  <span>{t("settings.lightMode", "Modo Claro (Activo)")}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 4. Notificaciones y Feed Remoto GitHub */}
        <div className="dark:bg-kyrn-card bg-white border dark:border-kyrn-border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-blue-500" />
            <h4 className="text-xs font-bold dark:text-white text-slate-900 uppercase tracking-wider">
              {t(
                "settings.notificationsSection",
                "Notificaciones Remotas (GitHub Static JSON)"
              )}
            </h4>
          </div>

          <p className="text-[11px] dark:text-slate-400 text-slate-500">
            {t(
              "settings.notificationsDesc",
              "Puedes configurar una URL estática de GitHub Raw que aloje un archivo JSON con anuncios, avisos importantes o actualizaciones sin requerir un servidor de base de datos."
            )}
          </p>

          <div className="space-y-2">
            <label className="text-xs font-semibold dark:text-slate-200 text-slate-800 flex items-center gap-1.5">
              <Globe size={14} className="text-slate-400" />
              <span>{t("settings.feedUrlLabel", "URL del Feed JSON (GitHub Raw o CDN)")}</span>
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                placeholder={t(
                  "settings.feedUrlPlaceholder",
                  "https://raw.githubusercontent.com/usuario/repo/main/notifications.json"
                )}
                value={feedUrl}
                onChange={(e) => setFeedUrl(e.target.value)}
                className="flex-1 dark:bg-kyrn-input bg-slate-50 border dark:border-kyrn-border border-slate-300 rounded-lg px-3 py-2 text-xs dark:text-white text-slate-900 font-mono focus:outline-none focus:border-kyrn-blue min-w-0"
              />
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={handleSaveFeed}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-kyrn-blue hover:bg-blue-600 text-white rounded-lg text-xs font-semibold shadow-glow transition-all"
                >
                  {savedFeed ? <Check size={14} /> : <Save size={14} />}
                  <span>{savedFeed ? t("settings.saved", "Guardado") : t("settings.save", "Guardar")}</span>
                </button>
                {onCheckRemote && (
                  <button
                    onClick={onCheckRemote}
                    disabled={isCheckingRemote}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    <RefreshCw
                      size={13}
                      className={isCheckingRemote ? "animate-spin text-blue-500" : ""}
                    />
                    <span>{t("settings.sync", "Sincronizar")}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t dark:border-kyrn-border/60 border-slate-200">
            <div>
              <p className="text-xs font-semibold dark:text-slate-200 text-slate-800">
                {t("settings.historyTitle", "Historial de IDs leídos / descartados")}
              </p>
              <p className="text-[11px] dark:text-slate-400 text-slate-500">
                {t(
                  "settings.historyDesc",
                  "Limpia los IDs recordados para permitir sincronizar y recibir de nuevo los anuncios remotos ya leídos"
                )}
              </p>
            </div>
            <button
              onClick={handleResetProcessedIds}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex-shrink-0"
            >
              {resetDone ? <Check size={13} className="text-emerald-500" /> : <Trash2 size={13} />}
              <span>
                {resetDone
                  ? t("settings.historyResetDone", "Historial reiniciado")
                  : t("settings.resetHistory", "Restablecer historial de IDs")}
              </span>
            </button>
          </div>
        </div>

        {/* 5. Actualizaciones del Sistema (GitHub Native) */}
        <div className="dark:bg-kyrn-card bg-white border dark:border-kyrn-border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowDownCircle size={16} className="text-emerald-500" />
              <h4 className="text-xs font-bold dark:text-white text-slate-900 uppercase tracking-wider">
                {t("settings.updatesSection", "Actualizaciones del Sistema (GitHub Native)")}
              </h4>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full dark:bg-emerald-950/60 bg-emerald-50 border dark:border-emerald-800/50 border-emerald-200 text-emerald-500 text-[10px] font-semibold">
              <ShieldCheck size={11} />
              <span>Zero-External / Native</span>
            </div>
          </div>

          <p className="text-[11px] dark:text-slate-400 text-slate-500">
            {t(
              "settings.updatesDesc",
              "Kyrnex incluye un motor de actualización nativo que consulta tu repositorio GitHub sin intermediarios ni programas externos, crea copias de seguridad de tus archivos y permite actualizar en caliente de forma segura."
            )}
          </p>

          {/* Toggle Actualizaciones Automáticas */}
          <div className="flex items-center justify-between pt-2 border-t dark:border-kyrn-border/60 border-slate-200">
            <div>
              <p className="text-xs font-semibold dark:text-slate-200 text-slate-800">
                {t("settings.autoUpdatesTitle", "Actualizaciones automáticas")}
              </p>
              <p className="text-[11px] dark:text-slate-400 text-slate-500">
                {t(
                  "settings.autoUpdatesDesc",
                  "Buscar e instalar nuevas versiones en segundo plano al iniciar la aplicación"
                )}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoUpdate}
                onChange={(e) => handleToggleAutoUpdate(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Feed URL de version_kyrnex.json */}
          <div className="space-y-1.5 pt-2 border-t dark:border-kyrn-border/60 border-slate-200">
            <label className="text-[11px] font-semibold dark:text-slate-300 text-slate-700 block">
              {t("settings.updateFeedUrl", "URL del archivo de versión (version_kyrnex.json)")}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={updateFeedUrl}
                onChange={(e) => setUpdateFeedUrl(e.target.value)}
                placeholder="https://raw.githubusercontent.com/.../version_kyrnex.json"
                className="flex-1 dark:bg-kyrn-input bg-slate-50 border dark:border-kyrn-border border-slate-300 rounded-lg px-3 py-1.5 text-xs dark:text-white text-slate-900 font-mono focus:outline-none focus:border-kyrn-blue"
              />
              <button
                onClick={handleSaveUpdateFeed}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex-shrink-0"
              >
                {updateFeedSaved ? (
                  <>
                    <Check size={13} className="text-emerald-500" />
                    <span>{t("settings.saved", "Guardado")}</span>
                  </>
                ) : (
                  <>
                    <Save size={13} />
                    <span>{t("settings.save", "Guardar")}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Acciones de comprobación y estado */}
          <div className="pt-2 border-t dark:border-kyrn-border/60 border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="text-xs">
                  <span className="text-slate-400">{t("settings.currentVersionLabel", "Versión instalada")}: </span>
                  <span className="font-bold font-mono dark:text-white text-slate-900">v{appConfig?.version || "1.0.0"}</span>
                </div>
                {updateResult?.latestVersion && (
                  <div className="text-xs">
                    <span className="text-slate-400">{t("settings.latestVersionLabel", "Última versión en GitHub")}: </span>
                    <span className="font-bold font-mono text-emerald-500">v{updateResult.latestVersion}</span>
                  </div>
                )}
              </div>

              <button
                onClick={handleCheckUpdates}
                disabled={isCheckingUpdate || isInstallingUpdate}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all disabled:opacity-50 flex-shrink-0"
              >
                <RefreshCw size={13} className={isCheckingUpdate ? "animate-spin" : ""} />
                <span>
                  {isCheckingUpdate
                    ? t("settings.checkingUpdates", "Consultando repositorio...")
                    : t("settings.checkUpdatesBtn", "Buscar actualizaciones ahora")}
                </span>
              </button>
            </div>

            {/* Resultado de comprobación: Al día */}
            {updateResult && !updateResult.hasUpdate && !updateResult.error && (
              <div className="flex items-center gap-2 p-3 rounded-lg dark:bg-emerald-950/30 bg-emerald-50 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs">
                <Check size={15} />
                <span>{t("settings.upToDate", "Kyrnex está al día")} (v{updateResult.currentVersion})</span>
              </div>
            )}

            {/* Resultado de comprobación: Actualización disponible */}
            {updateResult && updateResult.hasUpdate && !installSuccess && (
              <div className="p-4 rounded-xl dark:bg-indigo-950/40 bg-indigo-50 border border-indigo-500/40 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <DownloadCloud size={16} className="text-indigo-500" />
                      <h5 className="text-xs font-bold dark:text-white text-slate-900">
                        {t("settings.updateAvailable", "¡Nueva versión disponible!")}: v{updateResult.latestVersion}
                      </h5>
                    </div>
                    <p className="text-[11px] dark:text-slate-300 text-slate-600 mt-1">
                      {updateResult.changelog}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500 text-white font-bold">
                    v{updateResult.latestVersion}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-indigo-500/20 text-[11px] text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-500" />
                    <span>{t("settings.rollbackNotice", "Copia de seguridad creada automáticamente antes de aplicar cambios")}</span>
                  </div>

                  <button
                    onClick={handleInstallUpdate}
                    disabled={isInstallingUpdate}
                    className="flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all disabled:opacity-50"
                  >
                    <DownloadCloud size={13} className={isInstallingUpdate ? "animate-bounce" : ""} />
                    <span>
                      {isInstallingUpdate
                        ? t("settings.installingUpdate", "Descargando y creando copia de seguridad...")
                        : t("settings.installUpdateBtn", "Descargar e instalar actualización")}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Resultado de instalación completada: Botón reiniciar */}
            {installSuccess && (
              <div className="p-4 rounded-xl dark:bg-emerald-950/50 bg-emerald-50 border border-emerald-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                    <Check size={16} />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold dark:text-white text-slate-900">
                      {t("settings.updateReady", "Actualización instalada con éxito")}
                    </h5>
                    <p className="text-[11px] dark:text-slate-300 text-slate-600">
                      Reinicia la aplicación para comenzar a utilizar la nueva versión.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleRelaunch}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-glow transition-all"
                >
                  <RotateCcw size={14} />
                  <span>{t("settings.relaunchBtn", "Reiniciar Kyrnex ahora")}</span>
                </button>
              </div>
            )}

            {/* Error */}
            {installError && (
              <div className="flex items-center gap-2 p-3 rounded-lg dark:bg-red-950/40 bg-red-50 border border-red-500/40 text-red-500 text-xs">
                <AlertCircle size={15} />
                <span>{installError}</span>
              </div>
            )}
          </div>
        </div>

        {/* 6. Sección General Servidores */}
        <div className="dark:bg-kyrn-card bg-white border dark:border-kyrn-border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
          <h4 className="text-xs font-bold dark:text-white text-slate-900 uppercase tracking-wider">
            {t("settings.serverOptions", "Opciones de Servidores y Red")}
          </h4>

          <div className="flex items-center justify-between pt-2">
            <div>
              <p className="text-xs font-semibold dark:text-slate-200 text-slate-800">
                {t("settings.defaultPort", "Puerto inicial por defecto")}
              </p>
              <p className="text-[11px] dark:text-slate-400 text-slate-500">
                {t(
                  "settings.defaultPortDesc",
                  "Puerto base asignado automáticamente a los nuevos servidores creados"
                )}
              </p>
            </div>
            <input
              type="number"
              value={defaultPort}
              onChange={(e) => setDefaultPort(e.target.value)}
              className="w-24 dark:bg-kyrn-input bg-slate-50 border dark:border-kyrn-border border-slate-300 rounded-lg px-3 py-1.5 text-xs dark:text-white text-slate-900 font-mono focus:outline-none focus:border-kyrn-blue"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t dark:border-kyrn-border/60 border-slate-200">
            <div>
              <p className="text-xs font-semibold dark:text-slate-200 text-slate-800">
                {t("settings.autoStart", "Inicio con el Sistema")}
              </p>
              <p className="text-[11px] dark:text-slate-400 text-slate-500">
                {t(
                  "settings.autoStartDesc",
                  "Lanzar Kyrnex automáticamente al encender Windows"
                )}
              </p>
            </div>
            <input
              type="checkbox"
              checked={autoStartWindows}
              onChange={(e) => handleToggleAutoStart(e.target.checked)}
              className="rounded bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
            />
          </div>
        </div>

        {/* 6. Sección Vistas Previas y Rendimiento */}
        <div className="dark:bg-kyrn-card bg-white border dark:border-kyrn-border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
          <h4 className="text-xs font-bold dark:text-white text-slate-900 uppercase tracking-wider">
            {t("settings.cacheSection", "Caché y Rendimiento de Vistas Previas")}
          </h4>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold dark:text-slate-200 text-slate-800">
                {t("settings.clearCache", "Limpiar caché de capturas")}
              </p>
              <p className="text-[11px] dark:text-slate-400 text-slate-500">
                {t(
                  "settings.clearCacheDesc",
                  "Elimina las capturas almacenadas en disco para forzar regeneración fresca"
                )}
              </p>
            </div>
            <button
              onClick={handleClearCache}
              className="flex items-center gap-1.5 px-4 py-2 dark:bg-slate-800 bg-slate-100 hover:dark:bg-slate-700 hover:bg-slate-200 text-xs font-medium dark:text-slate-200 text-slate-700 rounded-lg border dark:border-slate-700 border-slate-300 transition-colors shadow-sm"
            >
              {cleared ? (
                <>
                  <Check size={14} className="text-emerald-500" />
                  <span>{t("settings.clearCacheDone", "Caché liberada")}</span>
                </>
              ) : (
                <>
                  <RefreshCw size={14} />
                  <span>{t("settings.clearCacheBtn", "Limpiar caché")}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsView;
