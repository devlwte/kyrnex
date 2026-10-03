import React, { useRef, useEffect } from "react";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCheck,
  Trash2,
  X,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { useTranslation } from "../../context/I18nContext";

export function NotificationPopover({
  isOpen,
  onClose,
  notifications = [],
  onMarkAllAsRead,
  onMarkAsRead,
  onClearAll,
  onDeleteNotification,
  onCheckRemote,
  isCheckingRemote,
}) {
  const { t } = useTranslation();
  const popoverRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getNotificationIcon = (type) => {
    switch (type) {
      case "error":
        return <AlertTriangle size={15} className="text-red-500" />;
      case "warning":
        return <AlertCircle size={15} className="text-amber-500" />;
      case "success":
        return <CheckCircle2 size={15} className="text-emerald-500" />;
      default:
        return <Info size={15} className="text-blue-500" />;
    }
  };

  const getBadgeStyle = (type) => {
    switch (type) {
      case "error":
        return "bg-red-500/10 border-red-500/30 text-red-500";
      case "warning":
        return "bg-amber-500/10 border-amber-500/30 text-amber-500";
      case "success":
        return "bg-emerald-500/10 border-emerald-500/30 text-emerald-500";
      default:
        return "bg-blue-500/10 border-blue-500/30 text-blue-500";
    }
  };

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 top-12 w-88 sm:w-96 dark:bg-[#0e1422] bg-white border dark:border-kyrn-border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col text-xs transition-colors duration-200"
    >
      {/* Header */}
      <div className="p-3.5 border-b dark:border-kyrn-border border-slate-200 flex items-center justify-between dark:bg-[#0a0f1b] bg-slate-50">
        <div className="flex items-center gap-2">
          <Bell size={15} className="text-blue-500" />
          <h4 className="font-bold dark:text-white text-slate-900">
            {t("notifications.title", "Notificaciones")}
          </h4>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white">
              {unreadCount} {t("notifications.newBadge", "nuevas")}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {notifications.length > 0 && (
            <>
              <button
                onClick={onMarkAllAsRead}
                title={t("notifications.markAllRead", "Marcar todas como leídas")}
                className="p-1 rounded dark:text-slate-400 text-slate-500 hover:dark:text-white hover:text-slate-900 hover:dark:bg-slate-800 hover:bg-slate-200 transition-colors"
              >
                <CheckCheck size={14} />
              </button>
              <button
                onClick={onClearAll}
                title={t("notifications.clearAll", "Limpiar todo")}
                className="p-1 rounded dark:text-slate-400 text-slate-500 hover:text-red-500 hover:dark:bg-slate-800 hover:bg-slate-200 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded dark:text-slate-400 text-slate-500 hover:dark:text-white hover:text-slate-900 hover:dark:bg-slate-800 hover:bg-slate-200 transition-colors ml-1"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-[360px] overflow-y-auto divide-y dark:divide-kyrn-border/50 divide-slate-100">
        {notifications.length > 0 ? (
          notifications.map((item) => (
            <div
              key={item.id}
              onClick={() => onMarkAsRead(item.id)}
              className={`p-3 flex items-start gap-3 transition-colors cursor-pointer ${
                !item.read
                  ? "dark:bg-blue-950/20 bg-blue-50/50 hover:dark:bg-blue-950/30 hover:bg-blue-50"
                  : "hover:dark:bg-slate-800/40 hover:bg-slate-50"
              }`}
            >
              {/* Type Icon */}
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center border flex-shrink-0 mt-0.5 ${getBadgeStyle(
                  item.type
                )}`}
              >
                {getNotificationIcon(item.type)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center justify-between gap-1">
                  <p
                    className={`font-semibold truncate ${
                      !item.read
                        ? "dark:text-white text-slate-900"
                        : "dark:text-slate-300 text-slate-700"
                    }`}
                  >
                    {item.title}
                  </p>
                  <span className="text-[10px] dark:text-slate-500 text-slate-400 flex-shrink-0">
                    {item.timeFormatted || item.time}
                  </span>
                </div>

                <p className="text-[11px] dark:text-slate-400 text-slate-600 line-clamp-2 leading-relaxed">
                  {item.message}
                </p>

                {item.link && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.kyrnexAPI?.system?.openExternal(item.link);
                    }}
                    className="flex items-center gap-1 text-[10px] text-blue-500 hover:underline pt-1 font-medium"
                  >
                    <span>{t("notifications.moreInfo", "Más información")}</span>
                    <ExternalLink size={10} />
                  </button>
                )}
              </div>

              {/* Delete / Dismiss item */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteNotification(item.id);
                }}
                className="opacity-40 hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-red-500 transition-opacity"
                title={t("notifications.delete", "Eliminar notificación")}
              >
                <X size={13} />
              </button>
            </div>
          ))
        ) : (
          <div className="py-12 px-6 text-center space-y-2">
            <div className="w-10 h-10 rounded-full dark:bg-slate-800/80 bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Bell size={18} />
            </div>
            <p className="font-semibold dark:text-slate-300 text-slate-700">
              {t("notifications.empty", "No hay notificaciones")}
            </p>
            <p className="text-[11px] dark:text-slate-500 text-slate-400 max-w-[220px] mx-auto">
              {t(
                "notifications.emptyDesc",
                "Las alertas de servidores, puertos y cambios importantes aparecerán aquí."
              )}
            </p>
          </div>
        )}
      </div>

      {/* Footer with Remote JSON Sync Info */}
      <div className="p-2.5 border-t dark:border-kyrn-border border-slate-200 dark:bg-[#0a0f1b] bg-slate-50 flex items-center justify-between text-[10px] dark:text-slate-400 text-slate-500">
        <span className="truncate max-w-[220px]">
          {t("notifications.remoteFeedReady", "Feed remoto listo (GitHub JSON)")}
        </span>
        <button
          onClick={onCheckRemote}
          disabled={isCheckingRemote}
          className="flex items-center gap-1 px-2 py-1 rounded dark:bg-slate-800 bg-white border dark:border-slate-700 border-slate-200 hover:dark:bg-slate-700 hover:bg-slate-100 dark:text-slate-300 text-slate-700 transition-colors"
          title={t("notifications.syncRemote", "Buscar avisos remotos")}
        >
          <RefreshCw
            size={11}
            className={isCheckingRemote ? "animate-spin text-blue-500" : ""}
          />
          <span>
            {isCheckingRemote
              ? t("notifications.checking", "Comprobando...")
              : t("settings.sync", "Sincronizar")}
          </span>
        </button>
      </div>
    </div>
  );
}

export default NotificationPopover;
