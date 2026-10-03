/**
 * DynExpress - Structured Logger
 * Emits real-time log events and supports console logging with color and timestamps.
 *
 * @module logger
 * @author KyrnForge
 * @license MIT
 */

import EventEmitter from "events";

export class Logger extends EventEmitter {
  constructor(options = {}) {
    super();
    this.maxLogs = options.maxLogs || 500;
    this.logs = [];
    this.silent = options.silent ?? false;
  }

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
      scope: scope || "DynExpress",
      message: typeof message === "object" ? JSON.stringify(message) : String(message),
      details: formattedDetails,
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    this.emit("log", entry);

    if (!this.silent) {
      this.#printToConsole(entry);
    }

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

  #printToConsole(entry) {
    const colors = {
      INFO: "\x1b[36m",
      SUCCESS: "\x1b[32m",
      WARN: "\x1b[33m",
      ERROR: "\x1b[31m",
      DEBUG: "\x1b[90m",
      RESET: "\x1b[0m",
      DIM: "\x1b[2m",
    };

    const color = colors[entry.level] || colors.RESET;
    const timeStr = `${colors.DIM}[${entry.timeFormatted}]${colors.RESET}`;
    const levelStr = `${color}[${entry.level}]${colors.RESET}`;
    const scopeStr = `[${entry.scope}]`;

    console.log(`${timeStr} ${levelStr} ${scopeStr} ${entry.message}`);
    if (entry.details && entry.level === "ERROR") {
      console.error(entry.details);
    }
  }

  getLogs(filter = {}) {
    return this.logs.filter((log) => {
      if (filter.level && log.level !== filter.level.toUpperCase()) return false;
      if (filter.scope && !log.scope.toLowerCase().includes(filter.scope.toLowerCase())) return false;
      return true;
    });
  }

  clear() {
    this.logs = [];
    this.emit("clear");
  }
}

export const logger = new Logger();
export default logger;
