/**
 * Kyrnex Core - KyrnexError
 * Custom error class with structured error codes and optional metadata
 *
 * @module KyrnexError
 */

import { ErrorCodes } from "./ErrorCodes.mjs";

export class KyrnexError extends Error {
  /**
   * @param {string} code - One of ErrorCodes
   * @param {string} message - Human-readable error message
   * @param {Object} [options={}] - Additional metadata or details
   */
  constructor(code = ErrorCodes.E_UNKNOWN, message = "Ha ocurrido un error en Kyrnex", options = {}) {
    super(message);
    this.name = "KyrnexError";
    this.code = code;
    this.details = options.details || null;
    this.timestamp = new Date();

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, KyrnexError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }
}

export default KyrnexError;
