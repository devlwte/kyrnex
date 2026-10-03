# DynExpress v2.0

<!-- <p align="center">
  <img src="https://raw.githubusercontent.com/devlwte/dynexpress/main/assets/banner.png" alt="DynExpress Banner" width="100%" onerror="this.style.display='none'"/>
</p> -->

<p align="center">
  <strong>Next-Generation Dynamic Multi-Server Express Runtime & Orchestrator for Node.js</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/dynexpress"><img src="https://img.shields.io/npm/v/dynexpress.svg?style=flat-square&color=blue" alt="npm version"/></a>
  <a href="https://github.com/devlwte/dynexpress/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green.svg?style=flat-square" alt="license"/></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg?style=flat-square" alt="node version"/></a>
  <a href="https://github.com/devlwte/dynexpress"><img src="https://img.shields.io/badge/github-devlwte%2Fdynexpress-black.svg?style=flat-square&logo=github" alt="github"/></a>
</p>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Why DynExpress?](#-why-dynexpress)
- [Key Features](#-key-features)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Fluent RouteBuilder API](#-fluent-routebuilder-api)
- [Core API Reference](#-core-api-reference)
  - [Server Management](#server-management)
  - [Route & Middleware Injection](#route--middleware-injection)
  - [Live Telemetry & Metrics](#live-telemetry--metrics)
  - [Route Introspection](#route-introspection)
- [Configuration Options](#-configuration-options)
- [Hot Reloading Router Files](#-hot-reloading-router-files)
- [Lifecycle Events](#-lifecycle-events)
- [Error Handling & ErrorCodes](#-error-handling--errorcodes)
- [Backward Compatibility (v1.x Support)](#-backward-compatibility-v1x-support)
- [TypeScript Support](#-typescript-support)
- [Use Cases](#-use-cases)
- [Author & License](#-author--license)

---

## ⚡ Overview

**DynExpress** is an enterprise-grade multi-server orchestrator built on top of Express.js. It allows developers and desktop platforms (such as Electron or Tauri) to dynamically spin up, inspect, hot-reload, rebind, and terminate dozens of independent HTTP Express servers inside a single Node.js runtime process—safely, reliably, and without port collision or socket-hanging issues.

Whether you are building a local development environment, an application runner like **Kyrnex**, microservices testing suites, or dynamic mock API gateways, **DynExpress v2.0** provides the granular control, speed, and resilience standard Express applications lack out of the box.

---

## 💡 Why DynExpress?

Running multiple HTTP servers dynamically in Node.js usually leads to frustrating issues:
1. **Port Hanging (`EADDRINUSE`)**: Traditional `server.close()` hangs indefinitely if a browser or HTTP client maintains an active keep-alive connection. DynExpress tracks every open socket in a native `Set` and forcefully destroys pending connections upon shutdown for immediate (<5ms) port release.
2. **Dynamic Routing**: Standard Express does not easily permit re-mounting entire route trees or adding middlewares dynamically on already listening servers. DynExpress enables hot route additions, sub-router prefixes, and dynamic middleware pipelines at runtime.
3. **Hot Module Reloading**: Modify your routes or controllers on disk, and DynExpress hot-swaps them instantly without dropping the listening port or restarting the parent Node process.
4. **Port Rebinding on the Fly**: Change the listening port of an active server with zero downtime and automatic route migration via `rebindPort()`.
5. **Real-Time Telemetry**: Instant insight into total requests, latency, active sockets, and HTTP 2xx/4xx/5xx status code breakdowns.

---

## ✨ Key Features

- 🚀 **Multi-Instance Server Management**: Spawn and manage multiple isolated Express instances concurrently.
- 🛡️ **Active Socket Tracking**: Instant port cleanup—no hanging HTTP keep-alive connections or `EADDRINUSE` errors.
- 🔀 **Fluent RouteBuilder API**: Chain routes declaratively with `.get()`, `.post()`, `.put()`, `.delete()`, `.use()`, and `.build()`.
- 🔄 **Zero-Downtime Hot Reloading**: Watch route files and reload changes without restarting the Node process.
- 📊 **Built-in Telemetry & Metrics**: Real-time request counts, status code analytics, uptime, and latency.
- 🌐 **Zero-Dependency CORS**: Automatic or configurable CORS support with pre-flight `OPTIONS 204` responses.
- 💉 **Dynamic Middleware Injection**: Register Express middlewares on servers while they are running.
- 🧩 **Sub-Router Mounting**: Mount sub-routes or builders under specific URL prefixes (`/api/v1`).
- 🛡️ **Safe JSON Error Boundary**: Prevents malformed JSON payloads from crashing the server process.
- ⏪ **100% Backward Compatible**: Full support for legacy v1 positional signatures (`newServer(name, port, routers)`).
- 🏷️ **Native TypeScript Types**: First-class typing definitions included out of the box (`index.d.ts`).

---

## 📦 Installation

```bash
npm install dynexpress
```

Or using Yarn / pnpm:

```bash
yarn add dynexpress
# or
pnpm add dynexpress
```

---

## 🚀 Quick Start

### 1. Simple Server with Modern Object Configuration

```javascript
import { dyn } from "dynexpress";

// Define and start a new server
const url = await dyn.startServer({
  name: "My API Server",
  port: 3000,
  cors: true,          // Automatic CORS headers
  healthCheck: true,   // Automatic /_kyrnex/health endpoint
  routers: [
    {
      method: "get",
      path: "/",
      handler: (req, res) => res.json({ message: "Welcome to DynExpress v2!" }),
    },
    {
      method: "post",
      path: "/users",
      handler: (req, res) => res.status(201).json({ user: req.body }),
    }
  ],
});

console.log(`Server listening on ${url}`);
// => Server listening on http://localhost:3000/
```

---

## 🔀 Fluent RouteBuilder API

DynExpress v2 includes a chainable `RouteBuilder` for defining clean, modular API routes:

```javascript
import { dyn } from "dynexpress";

// Create a fluent router with an optional prefix
const api = dyn.router("/api/v1")
  .get("/status", (req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  })
  .post("/submit", (req, res) => {
    res.json({ received: req.body });
  })
  .put("/items/:id", (req, res) => {
    res.json({ updated: req.params.id, data: req.body });
  })
  .delete("/items/:id", (req, res) => {
    res.status(204).end();
  });

// Launch server with the compiled route builder
const url = await dyn.startServer({
  name: "API Gateway",
  port: 4000,
  routers: api.build(), // or pass `api` directly!
});
```

---

## 📚 Core API Reference

### Server Management

#### `dyn.startServer(config)` / `dyn.newServer(config)`
Starts a new server instance. Accepts either an options object (v2) or positional arguments (v1).

```javascript
const url = await dyn.startServer({
  name: "Frontend Static",
  port: 8080,
  pathPublic: "./dist",
  autoPortFallback: true, // Automatically picks port 8081 if 8080 is taken
});
```

#### `dyn.stopServer(serverName)`
Stops a running server and immediately destroys all active client sockets.
```javascript
await dyn.stopServer("Frontend Static");
```

#### `dyn.restartServer(serverName)` / `dyn.resetServer(serverName)`
Gracefully stops and restarts an existing server with its original configuration.
```javascript
const newUrl = await dyn.restartServer("Frontend Static");
```

#### `dyn.rebindPort(serverName, newPort)`
Switches the port of a running server in real-time without losing registered routes or state.
```javascript
// Change port from 8080 to 9090 on the fly
const updatedUrl = await dyn.rebindPort("Frontend Static", 9090);
```

#### `dyn.stopAll()` / `dyn.cleanup()`
Stops all running servers, destroys file watchers, and terminates active connections.
```javascript
const count = await dyn.stopAll();
console.log(`Successfully stopped ${count} servers.`);
```

#### `dyn.isPortAvailable(port)`
Checks whether a given TCP port is free.
```javascript
const isFree = await dyn.isPortAvailable(3000);
```

#### `dyn.isRunning(serverName)`
Returns `true` if the server is currently running.
```javascript
if (dyn.isRunning("My API")) {
  console.log("Server is online!");
}
```

---

### Route & Middleware Injection

#### `dyn.use(serverName, [path], middleware)`
Injects an Express middleware dynamically into a running server. The middleware will execute for all subsequent requests.

```javascript
// Global middleware
dyn.use("My API", (req, res, next) => {
  res.setHeader("X-Custom-Header", "DynExpress-Engine");
  next();
});

// Path-scoped middleware
dyn.use("My API", "/secure", (req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
});
```

#### `dyn.addRoute(serverName, routeConfig)`
Adds a single route dynamically to a running server.
```javascript
dyn.addRoute("My API", {
  method: "get",
  path: "/dynamic-ping",
  handler: (req, res) => res.send("pong"),
});
```

#### `dyn.addRoutes(serverName, routesArray)`
Batch-mounts an array of route definitions onto a running server.
```javascript
dyn.addRoutes("My API", [
  { method: "get", path: "/route1", handler: (req, res) => res.send("1") },
  { method: "get", path: "/route2", handler: (req, res) => res.send("2") },
]);
```

#### `dyn.mount(serverName, prefix, routesOrBuilder)`
Mounts sub-routes or a `RouteBuilder` under a base prefix.
```javascript
const authRoutes = dyn.router()
  .post("/login", handleLogin)
  .post("/logout", handleLogout);

dyn.mount("My API", "/api/auth", authRoutes);
```

#### `dyn.setCors(serverName, [options])`
Enables or customizes CORS on a running server.
```javascript
dyn.setCors("My API", { origin: "https://myfrontend.com" });
// Or allow all origins:
dyn.setCors("My API", true);
```

#### `dyn.setStatic(serverName, dirPath)`
Dynamically mounts a directory as static assets.
```javascript
dyn.setStatic("My API", "./assets");
```

---

### Live Telemetry & Metrics

#### `dyn.getServerStats(serverName)`
Returns real-time performance and operational metrics for an active server.

```javascript
const stats = dyn.getServerStats("My API");
console.log(stats);
```

**Example Output:**
```json
{
  "name": "My API",
  "port": 3000,
  "uptimeSeconds": 142,
  "uptimeFormatted": "2m 22s",
  "requestsTotal": 1250,
  "totalRequests": 1250,
  "requests2xx": 1240,
  "requests4xx": 8,
  "requests5xx": 2,
  "statusCodes": {
    "200": 1200,
    "201": 40,
    "404": 8,
    "500": 2
  },
  "lastResponseTimeMs": 4,
  "activeSockets": 3,
  "routesCount": 12
}
```

---

### Route Introspection

#### `dyn.getRouteList(serverName)`
Returns an array of all registered endpoints and supported HTTP methods.

```javascript
const routes = dyn.getRouteList("My API");
console.log(routes);
// Output:
// [
//   { path: "/_kyrnex/health", methods: ["GET"] },
//   { path: "/api/v1/status", methods: ["GET"] },
//   { path: "/api/v1/submit", methods: ["POST"] }
// ]
```

#### `dyn.getAllServers()` / `dyn.getInstances()`
Returns a list of all active server instances with their metadata, uptime, and routes.

---

## ⚙️ Configuration Options

When creating a server with `dyn.startServer(options)` or `dyn.newServer(options)`, the following options are available:

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | **(Required)** | Unique identifier name for the server instance. |
| `port` | `number` | **(Required)** | Base port to listen on. |
| `routers` | `Array \| RouteBuilder \| string` | **(Required)** | Array of route objects, `RouteBuilder` instance, or file path to router module. |
| `appDir` | `string` | `process.cwd()` | Base working directory for resolving views and static paths. |
| `pathViews` | `string` | `bin/views` | Directory path for EJS views. |
| `pathPublic` | `string \| string[]` | `bin/public` | Directory or array of directories to serve as static files. |
| `watchFile` | `boolean` | `false` | Enable hot module reloading if `routers` is a file path. |
| `launch` | `Function` | `undefined` | Callback invoked after server is successfully launched or reloaded. |
| `moduleLoad` | `string` | `'default'` | Name of named export to import from router file (`default`, `routes`, etc.). |
| `autoPortFallback`| `boolean` | `true` | Automatically pick the next available port if requested port is occupied. |
| `cors` | `boolean \| string \| object` | `false` | Enable zero-dependency CORS. Accepts boolean, origin string, or options object. |
| `healthCheck` | `boolean \| string` | `false` | Expose health endpoint (boolean creates `/_kyrnex/health`, or specify custom path). |

---

## 🔄 Hot Reloading Router Files

DynExpress includes built-in hot reloading. Point `routers` to a `.js` or `.mjs` file and enable `watchFile: true`:

```javascript
// server.mjs
import { dyn } from "dynexpress";

await dyn.startServer({
  name: "Hot Server",
  port: 5000,
  routers: "./routes.mjs",
  watchFile: true,
});
```

```javascript
// routes.mjs
export default [
  {
    method: "get",
    path: "/live",
    handler: (req, res) => res.send("Version 1.0!"),
  }
];
```

When you edit and save `routes.mjs`, DynExpress invalidates the module cache, validates the new route structure, and swaps the internal route registry in real-time **without dropping the listening port or closing active client sockets**!

---

## 📡 Lifecycle Events

`DynExpress` extends Node's `EventEmitter` to broadcast events across the server lifecycle:

```javascript
import { dyn } from "dynexpress";

dyn.on("serverStarting", ({ name, requestedPort }) => {
  console.log(`Starting ${name} on port ${requestedPort}...`);
});

dyn.on("serverStarted", ({ name, port, url, startTime }) => {
  console.log(`${name} is now listening at ${url}`);
});

dyn.on("serverStopping", ({ name, port }) => {
  console.log(`Stopping ${name}...`);
});

dyn.on("serverStopped", ({ name, port }) => {
  console.log(`${name} stopped and port ${port} released.`);
});

dyn.on("serverRestarting", ({ name, port }) => {
  console.log(`Restarting ${name}...`);
});

dyn.on("routeAdded", ({ name, route }) => {
  console.log(`Mounted route ${route.method.toUpperCase()} ${route.path} on ${name}`);
});

dyn.on("serverError", ({ name, error }) => {
  console.error(`Error on server ${name}:`, error);
});
```

---

## 🛡️ Error Handling & ErrorCodes

DynExpress errors are instances of `DynExpressError` with standardized, machine-readable `code` properties:

```javascript
import { dyn, ErrorCodes, DynExpressError } from "dynexpress";

try {
  await dyn.startServer({
    name: "Locked Port",
    port: 80, // Often requires root/administrator privileges
    routers: [],
    autoPortFallback: false,
  });
} catch (err) {
  if (err instanceof DynExpressError) {
    switch (err.code) {
      case ErrorCodes.E_PORT_IN_USE:
        console.error("Port is currently in use by another application.");
        break;
      case ErrorCodes.E_PERMISSION_DENIED:
        console.error("Permission denied. Try running as administrator.");
        break;
      case ErrorCodes.E_SERVER_NOT_FOUND:
        console.error("Specified server instance does not exist.");
        break;
      default:
        console.error("DynExpress error:", err.message);
    }
  }
}
```

### Standard Error Codes

- `ErrorCodes.E_PORT_IN_USE`
- `ErrorCodes.E_PORT_INVALID`
- `ErrorCodes.E_SERVER_NOT_FOUND`
- `ErrorCodes.E_SERVER_START_FAILED`
- `ErrorCodes.E_MANIFEST_INVALID`
- `ErrorCodes.E_APP_NOT_FOUND`
- `ErrorCodes.E_PERMISSION_DENIED`
- `ErrorCodes.E_CONFIG_INVALID`
- `ErrorCodes.E_ROUTE_INVALID`

---

## ⏪ Backward Compatibility (v1.x Support)

DynExpress v2 is engineered with **100% backward compatibility**. If your project uses the v1 positional signature:

```javascript
import { dyn } from "dynexpress";

// Old v1.x signature continues to work seamlessly:
const url = await dyn.newServer("Legacy Server", 3000, [
  {
    method: "get",
    path: "/",
    handler: (req, res) => res.send("Legacy OK"),
  }
]);

// All legacy methods are preserved:
dyn.isRunning("Legacy Server");
dyn.isPortAvailable(3000);
dyn.addRoute("Legacy Server", { ... });
dyn.getInstances();
dyn.getInstance("Legacy Server");
await dyn.stopServer("Legacy Server");
await dyn.resetServer("Legacy Server");
await dyn.cleanup();
```

---

## 🔷 TypeScript Support

DynExpress includes type definitions (`index.d.ts`). You can write fully typed code in TypeScript:

```typescript
import { dyn, RouteDefinition, ServerConfig, ServerStats } from "dynexpress";

const routes: RouteDefinition[] = [
  {
    method: "get",
    path: "/api/items",
    handler: (req, res) => {
      res.json({ items: ["A", "B", "C"] });
    },
  },
];

const config: ServerConfig = {
  name: "TS Server",
  port: 7000,
  routers: routes,
  cors: true,
};

const url: string = await dyn.startServer(config);
const stats: ServerStats | null = dyn.getServerStats("TS Server");
```

---

## 🌐 Use Cases

- **Desktop Application Runtimes**: Run web applications locally inside Electron or Tauri frameworks (used natively in [Kyrnex](https://github.com/devlwte/kyrnex)).
- **Multi-Tenant Microservices**: Run and test independent microservices in parallel within a single test suite process.
- **Dynamic API Gateways**: Add, update, and remove routes on-the-fly based on database configurations or plugins.
- **Static Site Previews**: Dynamically spin up static file servers for project workspaces and destroy them cleanly when closed.

---

## 👤 Author & License

- **Author**: [KyrnForge](https://github.com/devlwte) (`devlwte`)
- **Repository**: [https://github.com/devlwte/dynexpress](https://github.com/devlwte/dynexpress)
- **Issues**: [https://github.com/devlwte/dynexpress/issues](https://github.com/devlwte/dynexpress/issues)
- **License**: Released under the [MIT License](LICENSE).
