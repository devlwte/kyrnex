/**
 * Kyrnex Notification Manager
 * Handles local events, alerts, and remote GitHub static JSON feeds
 * Prevents repetition by remembering processed/read/dismissed notification IDs
 */

const STORAGE_KEY = "kyrnex_notifications";
const DEFAULT_FEED_KEY = "kyrnex_remote_feed_url";
const PROCESSED_IDS_KEY = "kyrnex_processed_notification_ids";

export const notificationManager = {
  getStoredNotifications() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch {}

    // Default welcome notifications
    return [
      {
        id: "notif-welcome",
        title: "¡Bienvenido a Kyrnex v1.0.0!",
        message: "Plataforma de ejecución y gestión de servidores Express múltiples activa.",
        type: "success",
        timeFormatted: new Date().toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        read: false,
      },
      {
        id: "notif-ready",
        title: "Sistema de notificaciones listo",
        message: "Aquí recibirás alertas críticas de puertos ocupados, errores de código y novedades remotas.",
        type: "info",
        timeFormatted: new Date().toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        read: false,
      },
    ];
  },

  saveNotifications(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {}
  },

  getProcessedIds() {
    try {
      const data = localStorage.getItem(PROCESSED_IDS_KEY);
      if (data) {
        return new Set(JSON.parse(data));
      }
    } catch {}
    return new Set();
  },

  markIdAsProcessed(id) {
    if (!id) return;
    try {
      const set = this.getProcessedIds();
      set.add(id);
      localStorage.setItem(PROCESSED_IDS_KEY, JSON.stringify(Array.from(set)));
    } catch {}
  },

  markMultipleIdsAsProcessed(ids) {
    if (!ids || !ids.length) return;
    try {
      const set = this.getProcessedIds();
      ids.forEach((id) => id && set.add(id));
      localStorage.setItem(PROCESSED_IDS_KEY, JSON.stringify(Array.from(set)));
    } catch {}
  },

  resetProcessedIds() {
    try {
      localStorage.removeItem(PROCESSED_IDS_KEY);
      return true;
    } catch {
      return false;
    }
  },

  getRemoteFeedUrl() {
    return (
      localStorage.getItem(DEFAULT_FEED_KEY) ||
      "https://raw.githubusercontent.com/devlwte/kyrnex/main/kyrnexServers/notifications.json"
    );
  },

  setRemoteFeedUrl(url) {
    localStorage.setItem(DEFAULT_FEED_KEY, url);
  },

  /**
   * Fetch announcements and alerts from a remote GitHub static JSON file
   * Avoids re-adding announcements that were already read or dismissed by ID
   */
  async fetchRemoteNotifications(feedUrl) {
    const url = feedUrl || this.getRemoteFeedUrl();
    if (!url) return { newCount: 0, items: [] };

    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const remoteItems = await response.json();
      if (!Array.isArray(remoteItems)) return { newCount: 0, items: [] };

      const current = this.getStoredNotifications();
      const existingIds = new Set(current.map((n) => n.id));
      const processedIds = this.getProcessedIds();
      const newItems = [];

      for (const item of remoteItems) {
        if (!item || !item.id) continue;

        // Skip if already in the active list OR previously read/dismissed
        if (existingIds.has(item.id) || processedIds.has(item.id)) {
          continue;
        }

        const formatted = {
          id: item.id,
          title: item.title || "Notificación de Kyrnex",
          message: item.message || "",
          type: item.type || "info",
          link: item.link || null,
          timeFormatted: new Date().toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          read: false,
        };
        newItems.push(formatted);
      }

      return { newCount: newItems.length, items: newItems };
    } catch (err) {
      return { newCount: 0, items: [], error: err.message };
    }
  },
};

export default notificationManager;
