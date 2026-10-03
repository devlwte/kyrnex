import React from "react";
import { LayoutGrid, Play, Square, ExternalLink } from "lucide-react";
import { useTranslation } from "../../context/I18nContext";

export function ApplicationsView({ servers, onStart, onStop }) {
  const { t } = useTranslation();

  return (
    <div className="w-full space-y-6 select-none min-w-0">
      <div>
        <h3 className="text-lg font-bold dark:text-white text-slate-900">
          {t("apps.catalogTitle", "Catálogo de Aplicaciones")}
        </h3>
        <p className="text-xs dark:text-slate-400 text-slate-500">
          {t("apps.catalogSubtitle", "Gestiona todas tus aplicaciones web y servicios configurados en Kyrnex")}
        </p>
      </div>

      {!servers || servers.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center border border-dashed dark:border-kyrn-border border-slate-300 rounded-xl dark:bg-kyrn-card/50 bg-white/60 dark:text-slate-400 text-slate-500 text-xs p-6 text-center space-y-2">
          <LayoutGrid size={32} className="opacity-40 mb-1" />
          <p className="font-semibold text-sm dark:text-slate-300 text-slate-700">
            {t("apps.noApps", "No hay aplicaciones registradas")}
          </p>
          <p>
            {t("apps.noAppsDesc", "Crea tu primer servidor haciendo clic en '+ Nuevo servidor' en la barra superior.")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {servers.map((srv) => {
            const isRunning = srv.status === "running";
            return (
              <div
                key={srv.id}
                className="dark:bg-kyrn-card bg-white border dark:border-kyrn-border border-slate-200 rounded-xl p-5 space-y-4 hover:dark:border-slate-700 hover:border-slate-300 shadow-sm transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold dark:text-white text-slate-900">
                      {srv.name}
                    </h4>
                    <span className="text-[11px] text-blue-600 dark:text-blue-400 font-mono">
                      {t("apps.port", "Puerto")}: {srv.port}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium ${
                      isRunning
                        ? "dark:bg-emerald-950/60 bg-emerald-100 text-emerald-700 dark:text-emerald-400 border dark:border-emerald-800/40 border-emerald-300"
                        : "dark:bg-slate-800 bg-slate-100 dark:text-slate-400 text-slate-600"
                    }`}
                  >
                    {isRunning ? t("common.active", "Activo") : t("common.inactive", "Detenido")}
                  </span>
                </div>

                <div className="space-y-1 text-xs dark:text-slate-400 text-slate-600 font-mono">
                  <p className="truncate" title={srv.rootDir}>
                    📁 {srv.rootDir}
                  </p>
                  <p>📄 {srv.mainFile}</p>
                </div>

                <div className="pt-2 border-t dark:border-kyrn-border/60 border-slate-200 flex items-center justify-between">
                  {isRunning ? (
                    <button
                      onClick={() => onStop(srv.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800/40 rounded-lg hover:bg-amber-100"
                    >
                      <Square size={13} /> {t("apps.stop", "Detener")}
                    </button>
                  ) : (
                    <button
                      onClick={() => onStart(srv.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/40 rounded-lg hover:bg-emerald-100"
                    >
                      <Play size={13} /> {t("apps.start", "Iniciar")}
                    </button>
                  )}

                  <button
                    onClick={() =>
                      window.kyrnexAPI?.system?.openExternal(`http://localhost:${srv.port}`)
                    }
                    className="p-2 dark:text-slate-400 text-slate-500 hover:dark:text-white hover:text-slate-900 rounded-lg hover:dark:bg-slate-800 hover:bg-slate-100"
                    title={t("apps.openInBrowser", "Abrir en navegador")}
                  >
                    <ExternalLink size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ApplicationsView;
