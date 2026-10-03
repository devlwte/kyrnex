import React, { useState } from "react";
import {
  Server,
  LayoutGrid,
  FolderClosed,
  Settings,
  ClipboardList,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useTranslation } from "../../context/I18nContext";

export function Sidebar({ currentTab, setCurrentTab, serverCount }) {
  const { t, appConfig, defaultIconPng } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem("kyrnex_sidebar_collapsed") === "true";
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("kyrnex_sidebar_collapsed", String(next));
      return next;
    });
  };

  const menuItems = [
    { id: "servers", label: t("nav.servers", "Servidores"), icon: Server, badge: serverCount },
    { id: "apps", label: t("nav.apps", "Aplicaciones"), icon: LayoutGrid },
    { id: "files", label: t("nav.files", "Archivos"), icon: FolderClosed },
    { id: "settings", label: t("nav.settings", "Configuración"), icon: Settings },
    { id: "logs", label: t("nav.logs", "Registros"), icon: ClipboardList },
    { id: "help", label: t("nav.help", "Ayuda"), icon: HelpCircle },
  ];

  return (
    <aside
      className={`${
        isCollapsed ? "w-16" : "w-56 md:w-60 lg:w-64"
      } flex-shrink-0 dark:bg-kyrn-sidebar bg-slate-50/90 flex flex-col justify-between border-r dark:border-kyrn-border border-slate-200 h-full select-none transition-all duration-200 z-20`}
    >
      {/* Brand Header */}
      <div>
        <div
          className={`flex items-center ${
            isCollapsed ? "p-3 justify-center" : "p-4 sm:p-5 lg:p-6 justify-between"
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={appConfig?.branding?.iconPng || defaultIconPng}
              onError={(e) => {
                if (e.currentTarget.src !== defaultIconPng) {
                  e.currentTarget.src = defaultIconPng;
                }
              }}
              alt={appConfig?.branding?.logoAlt || "Kyrnex"}
              className="w-9 h-9 object-contain rounded-xl shadow-glow flex-shrink-0"
            />
            {!isCollapsed && (
              <div className="truncate">
                <h1 className="font-bold tracking-wider text-sm lg:text-base dark:text-white text-slate-900 truncate">
                  {appConfig?.appName || "KYRNEX"}
                </h1>
                <p className="text-[9px] lg:text-[10px] tracking-widest dark:text-slate-400 text-slate-500 font-medium uppercase truncate">
                  {t("app.subtitle", appConfig?.appSubtitle || "LOCAL WEB RUNTIME")}
                </p>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <button
              onClick={toggleCollapse}
              title={t("nav.collapse", "Colapsar menú lateral")}
              className="p-1 rounded-lg text-slate-400 hover:dark:text-white hover:text-slate-800 hover:dark:bg-slate-800 hover:bg-slate-200 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
          )}
        </div>

        {/* Collapsed expand button */}
        {isCollapsed && (
          <div className="flex justify-center pb-2">
            <button
              onClick={toggleCollapse}
              title={t("nav.expand", "Expandir menú lateral")}
              className="p-1.5 rounded-lg text-slate-400 hover:dark:text-white hover:text-slate-800 hover:dark:bg-slate-800 hover:bg-slate-200 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="px-2 space-y-1 mt-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                title={item.label}
                className={`w-full flex items-center ${
                  isCollapsed ? "justify-center px-0 py-2.5" : "justify-between px-3 py-2"
                } rounded-lg text-xs font-medium transition-all duration-150 relative ${
                  isActive
                    ? "bg-kyrn-blue text-white shadow-glow"
                    : "dark:text-slate-400 text-slate-600 hover:dark:text-white hover:text-slate-900 hover:dark:bg-slate-800/40 hover:bg-slate-200/70"
                }`}
              >
                <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3"} min-w-0`}>
                  <Icon
                    size={17}
                    className={`flex-shrink-0 ${
                      isActive ? "text-white" : "dark:text-slate-400 text-slate-500"
                    }`}
                  />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </div>

                {/* Badge */}
                {item.badge !== undefined && (
                  isCollapsed ? (
                    item.badge > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-white dark:ring-slate-900"></span>
                    )
                  ) : (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                        isActive
                          ? "bg-blue-800/80 text-white"
                          : "dark:bg-kyrn-border dark:text-slate-300 bg-slate-200 text-slate-700"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer System Status */}
      <div className={`p-3 border-t dark:border-kyrn-border/80 border-slate-200 ${isCollapsed ? "flex flex-col items-center gap-2" : "space-y-3"}`}>
        <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-2.5"}`}>
          <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-emeraldGlow"></span>
          </span>
          {!isCollapsed && (
            <div className="truncate">
              <p className="text-xs font-semibold dark:text-emerald-400 text-emerald-600 truncate">
                {t("app.systemReady", "Sistema listo")}
              </p>
              <p className="text-[10px] dark:text-slate-400 text-slate-500 truncate">
                {t("app.everythingActive", "Todo activo")}
              </p>
            </div>
          )}
        </div>

        {!isCollapsed && (
          <div className="flex items-center gap-2 pt-2 border-t dark:border-kyrn-border/40 border-slate-200">
            <img
              src={appConfig?.branding?.iconPng || defaultIconPng}
              onError={(e) => {
                if (e.currentTarget.src !== defaultIconPng) {
                  e.currentTarget.src = defaultIconPng;
                }
              }}
              alt="Kyrnex"
              className="w-6 h-6 object-contain rounded-md flex-shrink-0"
            />
            <div className="truncate">
              <p className="text-[11px] font-semibold dark:text-slate-200 text-slate-800 truncate">
                {appConfig?.appName || "KYRNEX"}{" "}
                <span className="text-[9px] dark:text-slate-400 text-slate-500 font-normal">
                  v{appConfig?.version || "1.0.0"}
                </span>
              </p>
              <p className="text-[9px] dark:text-slate-500 text-slate-400 truncate">
                {t("app.developedBy", "Desarrollado por KyrnForge")}
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
