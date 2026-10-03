/**
 * Kyrnex Core - Error Codes
 * Standardized error codes for the Kyrnex platform
 *
 * @module ErrorCodes
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

export default ErrorCodes;
