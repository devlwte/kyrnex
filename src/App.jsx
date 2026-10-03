import React, { useState, useEffect, useRef } from "react";
import { Sidebar } from "./components/layout/Sidebar";
import { TopHeader } from "./components/layout/TopHeader";
import { ServerCarousel } from "./components/servers/ServerCarousel";
import { ServerDetailTabs } from "./components/servers/ServerDetailTabs";
import { ServerRightPanel } from "./components/servers/ServerRightPanel";
import { NewServerModal } from "./components/servers/NewServerModal";

// Views for navigation
import { ApplicationsView } from "./components/views/ApplicationsView";
import { FilesView } from "./components/views/FilesView";
import { SettingsView } from "./components/views/SettingsView";
import { LogsView } from "./components/views/LogsView";
import { HelpView } from "./components/views/HelpView";

// Error Boundary to prevent black screen crashes
import { ErrorBoundary } from "./components/common/ErrorBoundary";

// Notification manager service
import { notificationManager } from "./services/notificationManager";
import { useTranslation } from "./context/I18nContext";

export function App() {
  const { t } = useTranslation();
  const [currentTab, setCurrentTab] = useState("servers");
  const [servers, setServers] = useState([]);
  const [selectedServerId, setSelectedServerId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [logs, setLogs] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [previews, setPreviews] = useState({});
  const [isRefreshingPreview, setIsRefreshingPreview] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("kyrnex-theme") || "dark";
  });

  // Notifications state
  const [notifications, setNotifications] = useState(() => {
    return notificationManager.getStoredNotifications();
  });
  const [isCheckingRemote, setIsCheckingRemote] = useState(false);

  // Keep a ref of servers and t for event handler notifications
  const serversRef = useRef(servers);
  const tRef = useRef(t);
  useEffect(() => {
    serversRef.current = servers;
    tRef.current = t;
  }, [servers, t]);

  // Save notifications when they change
  useEffect(() => {
    notificationManager.saveNotifications(notifications);
  }, [notifications]);

  // Apply theme to document element
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("kyrnex-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const lastNotifRef = useRef({ key: "", time: 0 });

  const addNotification = ({ title, message, type = "info", link = null }) => {
    // Prevent duplicate rapid-fire notifications within 800ms
    const key = `${title}:::${message}`;
    const now = Date.now();
    if (lastNotifRef.current.key === key && now - lastNotifRef.current.time < 800) {
      return;
    }
    lastNotifRef.current = { key, time: now };

    const newEntry = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title,
      message,
      type,
      link,
      timeFormatted: new Date().toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      read: false,
    };
    setNotifications((prev) => [newEntry, ...prev.slice(0, 49)]);
  };

  const handleMarkAllAsRead = () => {
    notificationManager.markMultipleIdsAsProcessed(notifications.map((n) => n.id));
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleMarkAsRead = (id) => {
    notificationManager.markIdAsProcessed(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleClearAllNotifications = () => {
    notificationManager.markMultipleIdsAsProcessed(notifications.map((n) => n.id));
    setNotifications([]);
  };

  const handleDeleteNotification = (id) => {
    notificationManager.markIdAsProcessed(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleCheckRemoteNotifications = async () => {
    setIsCheckingRemote(true);
    try {
      const result = await notificationManager.fetchRemoteNotifications();
      if (result.items && result.items.length > 0) {
        setNotifications((prev) => [...result.items, ...prev]);
        addNotification({
          title: "Sincronización remota",
          message: `Se han recibido ${result.items.length} notificaciones nuevas desde GitHub.`,
          type: "success",
        });
      } else {
        addNotification({
          title: "Feed remoto al día",
          message: result.error
            ? `Aviso: ${result.error}`
            : "No hay nuevos avisos en el feed de GitHub.",
          type: "info",
        });
      }
    } catch (err) {
      addNotification({
        title: "Error al sincronizar feed",
        message: err.message,
        type: "error",
      });
    } finally {
      setIsCheckingRemote(false);
    }
  };

  // Load initial servers & logs
  useEffect(() => {
    const loadInitialData = async () => {
      if (window.kyrnexAPI) {
        try {
          const srvList = await window.kyrnexAPI.servers.getAll();
          setServers(srvList);
          if (srvList.length > 0 && !selectedServerId) {
            setSelectedServerId(srvList[0].id);
          }

          const initialLogs = await window.kyrnexAPI.logs.getLogs(100);
          setLogs(initialLogs);
        } catch (err) {
          console.error("Error cargando datos iniciales:", err);
        }
      }
    };

    loadInitialData();

    // Event listeners from Electron IPC
    if (window.kyrnexAPI?.events) {
      const unsubStatus = window.kyrnexAPI.events.onServerStatusChanged((data) => {
        const currentServer = serversRef.current.find((s) => s.id === data.id);
        const prevStatus = currentServer ? currentServer.status : null;
        const srvName = currentServer ? currentServer.name : "Servidor";

        // Update server list state
        setServers((prev) => prev.map((s) => (s.id === data.id ? { ...s, ...data } : s)));

        // ONLY generate notification if status actually changed
        if (prevStatus && prevStatus !== data.status) {
          if (data.status === "error") {
            addNotification({
              title: `${tRef.current("notifications.serverError", "Error en")} ${srvName}`,
              message: data.error || "Ocurrió un error inesperado al procesar la solicitud",
              type: "error",
            });
          } else if (data.status === "running") {
            addNotification({
              title: `${srvName} ${tRef.current("notifications.serverActive", "activo")}`,
              message: `${tRef.current("notifications.serverListening", "El servidor está escuchando en el puerto")} ${data.port}`,
              type: "success",
            });
          } else if (data.status === "stopped") {
            addNotification({
              title: `${srvName} ${tRef.current("notifications.serverStopped", "detenido")}`,
              message: tRef.current("notifications.serverStoppedMsg", "El servidor ha sido detenido correctamente"),
              type: "info",
            });
          }
        }
      });

      const unsubMetrics = window.kyrnexAPI.events.onServerMetrics((data) => {
        setMetrics((prev) => ({
          ...prev,
          [data.id]: {
            connections: data.connections,
            memoryMb: data.memoryMb,
            cpu: data.cpu,
            requestsTotal: data.requestsTotal ?? 0,
          },
        }));
      });

      const unsubPreview = window.kyrnexAPI.events.onPreviewUpdated((data) => {
        setPreviews((prev) => ({
          ...prev,
          [data.id]: data.previewUrl,
        }));
      });

      const unsubLog = window.kyrnexAPI.logs?.onLog((entry) => {
        setLogs((prev) => [...prev.slice(-300), entry]);

        // If high severity error log, send alert notification
        if (entry.level === "ERROR" && !entry.message.includes("did-fail-load")) {
          addNotification({
            title: `Alerta: [${entry.scope}]`,
            message: entry.message,
            type: "error",
          });
        }
      });

      return () => {
        if (unsubStatus) unsubStatus();
        if (unsubMetrics) unsubMetrics();
        if (unsubPreview) unsubPreview();
        if (unsubLog) unsubLog();
      };
    }
  }, []);

  // Load cached preview when selecting server
  useEffect(() => {
    if (selectedServerId && window.kyrnexAPI?.preview) {
      if (!previews[selectedServerId]) {
        window.kyrnexAPI.preview.getCached(selectedServerId).then((cached) => {
          if (cached) {
            setPreviews((prev) => ({ ...prev, [selectedServerId]: cached }));
          }
        });
      }
    }
  }, [selectedServerId]);

  const selectedServer =
    servers.find((s) => s.id === selectedServerId) || servers[0] || null;

  // Filtered servers by search
  const filteredServers = servers.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      String(s.port).includes(q) ||
      s.rootDir.toLowerCase().includes(q)
    );
  });

  // Server actions
  const handleStartServer = async (id) => {
    try {
      await window.kyrnexAPI?.servers?.start(id);
      setTimeout(() => {
        handleRefreshPreview(id);
      }, 1200);
    } catch (err) {
      console.error("Error al iniciar servidor:", err);
      addNotification({
        title: t("notifications.serverStartFailed", "Fallo al iniciar servidor"),
        message: err.message,
        type: "error",
      });
    }
  };

  const handleStopServer = async (id) => {
    try {
      await window.kyrnexAPI?.servers?.stop(id);
    } catch (err) {
      console.error("Error al detener servidor:", err);
    }
  };

  const handleRestartServer = async (id) => {
    try {
      await window.kyrnexAPI?.servers?.restart(id);
      addNotification({
        title: t("notifications.serverRestarted", "Servidor reiniciado"),
        message: t("notifications.serverRestartedMsg", "Las rutas y configuraciones se han recargado"),
        type: "info",
      });
    } catch (err) {
      console.error("Error al reiniciar servidor:", err);
    }
  };

  const handleDeleteServer = async (id) => {
    try {
      const srvToDelete = servers.find((s) => s.id === id);
      await window.kyrnexAPI?.servers?.delete(id);
      setServers((prev) => prev.filter((s) => s.id !== id));
      if (selectedServerId === id) {
        const remaining = servers.filter((s) => s.id !== id);
        setSelectedServerId(remaining.length > 0 ? remaining[0].id : null);
      }
      addNotification({
        title: t("notifications.serverDeleted", "Servidor eliminado"),
        message: `'${srvToDelete?.name || id}'`,
        type: "warning",
      });
    } catch (err) {
      console.error("Error al eliminar servidor:", err);
    }
  };

  const handleSaveServer = async (id, updates) => {
    try {
      const updated = await window.kyrnexAPI?.servers?.update(id, updates);
      setServers((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...updated } : s))
      );
      addNotification({
        title: t("notifications.serverSaved", "Configuración guardada"),
        message: `'${updates.name || id}'`,
        type: "success",
      });
    } catch (err) {
      console.error("Error al guardar servidor:", err);
      addNotification({
        title: t("notifications.serverSaveFailed", "Error al guardar configuración"),
        message: err.message,
        type: "error",
      });
    }
  };

  const handleCreateServer = async (config) => {
    try {
      const created = await window.kyrnexAPI?.servers?.create(config);
      setServers((prev) => [...prev, created]);
      setSelectedServerId(created.id);
      addNotification({
        title: t("notifications.serverCreated", "Nuevo servidor creado"),
        message: `'${created.name}' (Port ${created.port})`,
        type: "success",
      });
    } catch (err) {
      console.error("Error al crear servidor:", err);
      addNotification({
        title: t("notifications.serverCreateFailed", "Error al crear servidor"),
        message: err.message,
        type: "error",
      });
    }
  };

  const handleRefreshPreview = async (targetId = null) => {
    const id = targetId || selectedServerId;
    if (!id || isRefreshingPreview) return;

    setIsRefreshingPreview(true);
    try {
      const base64 = await window.kyrnexAPI?.preview?.capture(id);
      if (base64) {
        setPreviews((prev) => ({ ...prev, [id]: base64 }));
        addNotification({
          title: t("notifications.previewUpdated", "Vista previa actualizada"),
          message: t("notifications.previewUpdatedMsg", "Captura de pantalla en caliente generada"),
          type: "success",
        });
      }
    } catch (err) {
      console.error("Error capturando vista previa:", err);
      addNotification({
        title: "Error",
        message: err.message,
        type: "warning",
      });
    } finally {
      setIsRefreshingPreview(false);
    }
  };

  const handleToggleStatus = (id, active) => {
    if (active) {
      handleStartServer(id);
    } else {
      handleStopServer(id);
    }
  };

  const handleClearLogs = async () => {
    await window.kyrnexAPI?.logs?.clearLogs();
    setLogs([]);
  };

  return (
    <div className="flex h-screen w-screen dark:bg-kyrn-bg bg-slate-100 dark:text-slate-100 text-slate-800 overflow-hidden font-sans transition-colors duration-200">
      {/* 1. Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        serverCount={servers.length}
      />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Top Header */}
        <TopHeader
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onNewServerClick={() => setIsModalOpen(true)}
          theme={theme}
          toggleTheme={toggleTheme}
          notifications={notifications}
          onMarkAllAsRead={handleMarkAllAsRead}
          onMarkAsRead={handleMarkAsRead}
          onClearAll={handleClearAllNotifications}
          onDeleteNotification={handleDeleteNotification}
          onCheckRemote={handleCheckRemoteNotifications}
          isCheckingRemote={isCheckingRemote}
          title={t(`titles.${currentTab}`)}
          subtitle={t(`titles.${currentTab}Subtitle`)}
        />

        {/* Dynamic View Body */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-5 md:p-6 min-w-0">
          <ErrorBoundary onReset={() => setCurrentTab("servers")}>
            {currentTab === "servers" && (
              <div className="space-y-6 w-full min-w-0">
                {/* Carousel of Multi-Servers with Horizontal Scroll */}
                <section className="w-full min-w-0">
                  <ServerCarousel
                    servers={filteredServers}
                    selectedServerId={selectedServerId}
                    onSelectServer={(id) => setSelectedServerId(id)}
                    onStartServer={handleStartServer}
                    onStopServer={handleStopServer}
                    onRestartServer={handleRestartServer}
                    onDeleteServer={handleDeleteServer}
                  />
                </section>

                {/* Main Lower Split Layout: Config Tabs + Right Inspector */}
                <div className="grid grid-cols-12 gap-6 items-start w-full min-w-0">
                  {/* Center Config Panel */}
                  <div className="col-span-12 xl:col-span-8 min-w-0">
                    <ServerDetailTabs
                      server={selectedServer}
                      onSave={handleSaveServer}
                      onCancel={() => {}}
                      onToggleStatus={handleToggleStatus}
                    />
                  </div>

                  {/* Right Inspector & Preview Panel */}
                  <div className="col-span-12 xl:col-span-4 min-w-0">
                    <ServerRightPanel
                      server={selectedServer}
                      metrics={selectedServer ? metrics[selectedServer.id] : null}
                      previewImage={
                        selectedServer ? previews[selectedServer.id] : null
                      }
                      onRefreshPreview={() => handleRefreshPreview()}
                      isRefreshingPreview={isRefreshingPreview}
                      logs={logs}
                      onViewAllLogs={() => setCurrentTab("logs")}
                    />
                  </div>
                </div>
              </div>
            )}

            {currentTab === "apps" && (
              <ApplicationsView
                servers={servers}
                onStart={handleStartServer}
                onStop={handleStopServer}
              />
            )}

            {currentTab === "files" && (
              <FilesView selectedServer={selectedServer} />
            )}

            {currentTab === "settings" && (
              <SettingsView
                theme={theme}
                toggleTheme={toggleTheme}
                onCheckRemote={handleCheckRemoteNotifications}
                isCheckingRemote={isCheckingRemote}
              />
            )}

            {currentTab === "logs" && (
              <LogsView logs={logs} onClearLogs={handleClearLogs} />
            )}

            {currentTab === "help" && <HelpView />}
          </ErrorBoundary>
        </main>
      </div>

      {/* New Server Modal */}
      <NewServerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateServer}
      />
    </div>
  );
}

export default App;
