/**
 * Kyrnex Core - Structured Logger
 * Emits real-time log events and maintains an in-memory ring buffer for UI console display
 *
 * @module Logger
 */

import EventEmitter from "events";

export class Logger extends EventEmitter {
  constructor(options = {}) {
    super();
    this.maxLogs = options.maxLogs || 500;
    this.logs = [];
    this.silent = options.silent ?? false;
  }

  /**
   * Log an event
   * @param {string} level - 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR' | 'DEBUG'
   * @param {string} scope - Component or module name (e.g., 'DynExpress')
   * @param {string} message - Main log message
   * @param {*} [details=null] - Optional additional error or object details
   */
  log(level, scope, message, details = null) {
    const now = new Date();
    const timeFormatted = now.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    let formattedDetails = null;
    if (details) {
      if (details instanceof Error) {
        formattedDetails = {
          name: details.name,
          message: details.message,
          stack: details.stack,
          code: details.code,
        };
      } else if (typeof details === "object") {
        try {
          formattedDetails = JSON.parse(JSON.stringify(details));
        } catch {
          formattedDetails = String(details);
        }
      } else {
        formattedDetails = details;
      }
    }

    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      timestamp: now.toISOString(),
      timeFormatted,
      level: level.toUpperCase(),
      scope: scope || "Sistema",
      message: typeof message === "object" ? JSON.stringify(message) : String(message),
      details: formattedDetails,
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    if (!this.silent) {
      const colors = {
        INFO: "\x1b[36m",    // Cyan
        SUCCESS: "\x1b[32m", // Green
        WARN: "\x1b[33m",    // Yellow
        ERROR: "\x1b[31m",   // Red
        DEBUG: "\x1b[90m",   // Gray
      };
      const reset = "\x1b[0m";
      const color = colors[entry.level] || "";
      console.log(`${color}[${entry.timeFormatted}] [${entry.level}] [${entry.scope}] ${entry.message}${reset}`);
      if (entry.details && entry.details.stack) {
        console.error(entry.details.stack);
      }
    }

    this.emit("log", entry);
    return entry;
  }

  info(scope, message, details = null) {
    return this.log("INFO", scope, message, details);
  }

  success(scope, message, details = null) {
    return this.log("SUCCESS", scope, message, details);
  }

  warn(scope, message, details = null) {
    return this.log("WARN", scope, message, details);
  }

  error(scope, message, details = null) {
    return this.log("ERROR", scope, message, details);
  }

  debug(scope, message, details = null) {
    return this.log("DEBUG", scope, message, details);
  }

  getLogs(limit = 100) {
    return this.logs.slice(-limit);
  }

  clear() {
    this.logs = [];
    this.emit("cleared");
  }
}

export const logger = new Logger();
export default logger;
