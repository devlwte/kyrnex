import { EventEmitter } from "events";
import type { Request, Response, NextFunction } from "express";

export type RouteHandler = (req: Request, res: Response, next?: NextFunction) => any;
export type RouteMiddleware = (req: Request, res: Response, next: NextFunction) => any;

export interface RouteDefinition {
  method: "get" | "post" | "put" | "delete" | "patch" | "options" | "head" | "all" | string;
  path: string;
  middleware?: RouteMiddleware | RouteMiddleware[] | null;
  handler: RouteHandler;
}

export interface ServerConfig {
  name: string;
  port: number;
  routers: RouteDefinition[] | RouteBuilder | string;
  appDir?: string;
  pathViews?: string;
  pathPublic?: string | string[];
  watchFile?: boolean;
  launch?: () => void;
  moduleLoad?: "default" | "router" | "routes" | string;
  autoPortFallback?: boolean;
  cors?: boolean | string | { origin?: string };
  healthCheck?: boolean | string;
}

export interface ServerStats {
  name: string;
  port: number;
  uptimeSeconds: number;
  uptimeFormatted: string;
  requestsTotal: number;
  totalRequests: number;
  requests2xx: number;
  requests4xx: number;
  requests5xx: number;
  statusCodes: Record<string | number, number>;
  lastResponseTimeMs: number;
  activeSockets: number;
  routesCount: number;
}

export interface ServerInstanceInfo {
  name: string;
  port: number;
  url: string;
  startTime: Date;
  lastUpdated: Date;
  watchingFile?: boolean;
  routes: Array<{ path: string; methods: string[] }>;
  stats: ServerStats | null;
}

export class RouteBuilder {
  prefix: string;
  routes: RouteDefinition[];
  constructor(basePrefix?: string);
  get(path: string, ...handlers: Array<RouteMiddleware | RouteHandler>): this;
  post(path: string, ...handlers: Array<RouteMiddleware | RouteHandler>): this;
  put(path: string, ...handlers: Array<RouteMiddleware | RouteHandler>): this;
  delete(path: string, ...handlers: Array<RouteMiddleware | RouteHandler>): this;
  patch(path: string, ...handlers: Array<RouteMiddleware | RouteHandler>): this;
  options(path: string, ...handlers: Array<RouteMiddleware | RouteHandler>): this;
  all(path: string, ...handlers: Array<RouteMiddleware | RouteHandler>): this;
  use(pathOrMiddleware: string | RouteMiddleware, ...handlers: RouteMiddleware[]): this;
  build(): RouteDefinition[];
}

export class DynExpressError extends Error {
  code: string;
  details?: any;
  timestamp: Date;
  constructor(code?: string, message?: string, options?: { details?: any });
  toJSON(): object;
}

export const KyrnexError: typeof DynExpressError;

export const ErrorCodes: {
  readonly E_MANIFEST_INVALID: string;
  readonly E_APP_NOT_FOUND: string;
  readonly E_PORT_INVALID: string;
  readonly E_PORT_IN_USE: string;
  readonly E_PERMISSION_DENIED: string;
  readonly E_SERVER_NOT_FOUND: string;
  readonly E_SERVER_START_FAILED: string;
  readonly E_CONFIG_INVALID: string;
  readonly E_ROUTE_INVALID: string;
  readonly E_PROCESS_ERROR: string;
  readonly E_UNKNOWN: string;
};

export class Logger extends EventEmitter {
  constructor(options?: { maxLogs?: number; silent?: boolean });
  log(level: string, scope: string, message: string, details?: any): any;
  info(scope: string, message: string, details?: any): any;
  success(scope: string, message: string, details?: any): any;
  warn(scope: string, message: string, details?: any): any;
  error(scope: string, message: string, details?: any): any;
  debug(scope: string, message: string, details?: any): any;
}

export const logger: Logger;

export class DynExpress extends EventEmitter {
  constructor(options?: {
    silent?: boolean;
    maxDepth?: number;
    viewsPath?: string;
    publicPath?: string;
  });

  createRouter(prefix?: string): RouteBuilder;
  router(prefix?: string): RouteBuilder;

  newServer(config: ServerConfig): Promise<string>;
  newServer(name: string, port: number, routers: RouteDefinition[] | string): Promise<string>;
  startServer(config: ServerConfig): Promise<string>;

  stopServer(serverName: string): Promise<boolean>;
  resetServer(serverName: string): Promise<string>;
  restartServer(serverName: string): Promise<string>;

  rebindPort(serverName: string, newPort: number): Promise<string>;

  addRoute(serverName: string, route: RouteDefinition): void;
  addRoutes(serverName: string, routesArray: RouteDefinition[]): void;

  use(serverName: string, middleware: RouteMiddleware): void;
  use(serverName: string, path: string, middleware: RouteMiddleware): void;

  mount(serverName: string, prefix: string, subRoutes: RouteDefinition[] | RouteBuilder): void;

  setCors(serverName: string, options?: boolean | string | { origin?: string }): void;
  setStatic(serverName: string, dirPath: string): boolean;

  getServerStats(serverName: string): ServerStats | null;
  getRouteList(serverName: string): Array<{ path: string; methods: string[] }>;

  getInstances(): ServerInstanceInfo[];
  getAllServers(): ServerInstanceInfo[];

  getInstance(serverName: string): ServerInstanceInfo;
  getServer(serverName: string): ServerInstanceInfo;

  isPortAvailable(port: number): Promise<boolean>;
  isRunning(serverName: string): boolean;

  cleanup(): Promise<number>;
  stopAll(): Promise<number>;
}

export const dyn: DynExpress;
export default DynExpress;
