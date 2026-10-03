import React, { useState } from "react";
import {
  Search,
  Moon,
  Sun,
  Bell,
  Minus,
  Square,
  X,
  Plus,
} from "lucide-react";
import { NotificationPopover } from "../notifications/NotificationPopover";
import { useTranslation } from "../../context/I18nContext";

export function TopHeader({
  searchQuery,
  setSearchQuery,
  onNewServerClick,
  title,
  subtitle,
  theme = "dark",
  toggleTheme,
  notifications = [],
  onMarkAllAsRead,
  onMarkAsRead,
  onClearAll,
  onDeleteNotification,
  onCheckRemote,
  isCheckingRemote,
}) {
  const { t, appConfig } = useTranslation();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const displayTitle = title || t("titles.servers", "Servidores Locales");
  const displaySubtitle = subtitle || t("titles.serversSubtitle", "Gestiona tus servidores Express y aplicaciones web");
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMinimize = () => {
    window.kyrnexAPI?.windowControls?.minimize();
  };

  const handleMaximize = () => {
    window.kyrnexAPI?.windowControls?.maximize();
  };

  const handleClose = () => {
    window.kyrnexAPI?.windowControls?.close();
  };

  return (
    <header className="titlebar-drag h-16 sm:h-20 px-3 sm:px-5 md:px-8 flex items-center justify-between border-b dark:border-kyrn-border/80 border-slate-200 dark:bg-kyrn-bg/95 bg-white/95 transition-colors duration-200 select-none relative z-30 min-w-0 flex-shrink-0">
      {/* Title & Subtitle */}
      <div className="titlebar-no-drag min-w-0 mr-2 sm:mr-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm sm:text-base md:text-xl font-bold dark:text-white text-slate-900 tracking-wide transition-colors truncate">
            {displayTitle}
          </h2>
          <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full dark:bg-blue-950/70 bg-blue-100 text-blue-600 dark:text-blue-400 border dark:border-blue-500/30 border-blue-200 flex-shrink-0">
            v{appConfig?.version || "1.0.2"}
          </span>
        </div>
        <p className="text-[10px] sm:text-xs dark:text-slate-400 text-slate-500 mt-0.5 transition-colors truncate hidden lg:block">
          {displaySubtitle}
        </p>
      </div>

      {/* Center & Right Controls */}
      <div className="flex items-center gap-1.5 sm:gap-3 md:gap-4 flex-shrink-0">
        {/* Search Input */}
        <div className="titlebar-no-drag relative w-28 sm:w-44 md:w-56 lg:w-64 transition-all">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 dark:text-slate-400 text-slate-400"
          />
          <input
            type="text"
            placeholder={t("header.searchPlaceholder", "Buscar...")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full dark:bg-[#0d131f] bg-slate-100 border dark:border-kyrn-border border-slate-200 text-xs dark:text-slate-200 text-slate-800 pl-8 pr-2.5 py-1.5 sm:py-2 rounded-lg focus:outline-none focus:border-kyrn-blue transition-colors placeholder:text-slate-400"
          />
        </div>

        {/* Quick Icon Buttons */}
        <div className="titlebar-no-drag flex items-center gap-0.5 sm:gap-1 dark:text-slate-400 text-slate-500">
          <button
            onClick={toggleTheme}
            title={theme === "dark" ? t("header.themeLight", "Cambiar a modo claro") : t("header.themeDark", "Cambiar a modo oscuro")}
            className="p-1.5 sm:p-2 rounded-lg hover:dark:text-slate-200 hover:text-slate-900 hover:dark:bg-slate-800/60 hover:bg-slate-100 transition-colors"
          >
            {theme === "dark" ? (
              <Sun size={16} className="text-amber-400" />
            ) : (
              <Moon size={16} className="text-slate-700" />
            )}
          </button>

          {/* Bell Notifications */}
          <div className="relative">
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              title={t("header.notifications", "Notificaciones")}
              className="p-1.5 sm:p-2 rounded-lg hover:dark:text-slate-200 hover:text-slate-900 hover:dark:bg-slate-800/60 hover:bg-slate-100 transition-colors relative"
            >
              <Bell size={16} />
              {unreadCount > 0 ? (
                <span className="absolute -top-0.5 -right-0.5 px-1 py-0.2 rounded-full text-[9px] font-bold bg-blue-600 text-white min-w-[15px] text-center shadow-glow">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-slate-400 rounded-full opacity-40"></span>
              )}
            </button>

            {/* Notification Popover Dropdown */}
            <NotificationPopover
              isOpen={isNotifOpen}
              onClose={() => setIsNotifOpen(false)}
              notifications={notifications}
              onMarkAllAsRead={onMarkAllAsRead}
              onMarkAsRead={onMarkAsRead}
              onClearAll={onClearAll}
              onDeleteNotification={onDeleteNotification}
              onCheckRemote={onCheckRemote}
              isCheckingRemote={isCheckingRemote}
            />
          </div>
        </div>

        {/* New Server Primary Button */}
        <div className="titlebar-no-drag">
          <button
            onClick={onNewServerClick}
            title={t("header.newServer", "Crear nuevo servidor")}
            className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg shadow-glow transition-all active:scale-[0.98]"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">{t("header.newServer", "Nuevo servidor")}</span>
          </button>
        </div>

        {/* Window controls (Min, Max, Close) */}
        <div className="titlebar-no-drag flex items-center gap-0.5 sm:gap-1 pl-1 sm:pl-2 border-l dark:border-kyrn-border/60 border-slate-200">
          <button
            onClick={handleMinimize}
            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center dark:text-slate-400 text-slate-500 hover:dark:text-white hover:text-slate-900 hover:dark:bg-slate-800/80 hover:bg-slate-200 rounded transition-colors"
            title={t("header.minimize", "Minimizar")}
          >
            <Minus size={13} />
          </button>
          <button
            onClick={handleMaximize}
            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center dark:text-slate-400 text-slate-500 hover:dark:text-white hover:text-slate-900 hover:dark:bg-slate-800/80 hover:bg-slate-200 rounded transition-colors"
            title={t("header.maximize", "Maximizar")}
          >
            <Square size={11} />
          </button>
          <button
            onClick={handleClose}
            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center dark:text-slate-400 text-slate-500 hover:text-white hover:bg-red-600 rounded transition-colors"
            title={t("header.close", "Cerrar")}
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </header>
  );
}

export default TopHeader;
