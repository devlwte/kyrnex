/**
 * DynExpress - Error Types and Codes
 * Standardized error handling for the DynExpress engine.
 *
 * @module errors
 * @author KyrnForge
 * @license MIT
 */

export const ErrorCodes = Object.freeze({
  E_MANIFEST_INVALID: "E_MANIFEST_INVALID",
  E_APP_NOT_FOUND: "E_APP_NOT_FOUND",
  E_PORT_INVALID: "E_PORT_INVALID",
  E_PORT_IN_USE: "E_PORT_IN_USE",
  E_PERMISSION_DENIED: "E_PERMISSION_DENIED",
  E_SERVER_NOT_FOUND: "E_SERVER_NOT_FOUND",
  E_SERVER_START_FAILED: "E_SERVER_START_FAILED",
  E_CONFIG_INVALID: "E_CONFIG_INVALID",
  E_ROUTE_INVALID: "E_ROUTE_INVALID",
  E_PROCESS_ERROR: "E_PROCESS_ERROR",
  E_UNKNOWN: "E_UNKNOWN",
});

export class DynExpressError extends Error {
  /**
   * @param {string} code - One of ErrorCodes
   * @param {string} message - Human-readable error message
   * @param {Object} [options={}] - Additional metadata or details
   */
  constructor(code = ErrorCodes.E_UNKNOWN, message = "Ha ocurrido un error en DynExpress", options = {}) {
    super(message);
    this.name = "DynExpressError";
    this.code = code;
    this.details = options.details || null;
    this.timestamp = new Date();

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DynExpressError);
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

// Backwards-compatible alias for Kyrnex integration
export const KyrnexError = DynExpressError;

export default DynExpressError;
