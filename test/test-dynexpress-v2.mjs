/**
 * DynExpress v2.0 Verification Suite
 * Tests backward compatibility with legacy positional arguments,
 * fluent RouteBuilder API, dynamic middlewares, telemetry/metrics,
 * route introspection, and graceful hot-port rebinding.
 */

import { dyn } from "dynexpress";

async function runV2Suite() {
  console.log("=== INICIANDO SUITE DE VERIFICACIÓN DYNEXPRESS v2.0 ===");

  try {
    // ------------------------------------------------------------------------
    // TEST 1: Compatibilidad con sintaxis antigua (posicional)
    // ------------------------------------------------------------------------
    console.log("\n[TEST 1] Probando compatibilidad con firma antigua newServer(name, port, routers)...");
    const legacyPort = 3110;
    const legacyUrl = await dyn.newServer("Servidor Legacy", legacyPort, [
      {
        method: "get",
        path: "/ping",
        handler: (req, res) => res.send("pong"),
      },
    ]);
    console.log("Servidor legado iniciado correctamente en:", legacyUrl);

    const pingRes = await fetch(`${legacyUrl}ping`);
    const pingText = await pingRes.text();
    if (pingText !== "pong") throw new Error("Fallo en test de servidor legado");
    console.log("Respuesta servidor legado:", pingText);

    await dyn.stopServer("Servidor Legacy");
    console.log("Servidor legado detenido con éxito.");

    // ------------------------------------------------------------------------
    // TEST 2: Fluent RouteBuilder y servidor v2 con CORS y Telemetría
    // ------------------------------------------------------------------------
    console.log("\n[TEST 2] Probando Fluent RouteBuilder y servidor v2...");
    const v2Port = 3120;

    // Crear rutas con RouteBuilder
    const apiRouter = dyn.router("/api")
      .get("/hello", (req, res) => {
        res.json({ message: "Hello from DynExpress v2!", version: "2.0.0" });
      })
      .post("/echo", (req, res) => {
        res.json({ received: req.body });
      });

    const v2Url = await dyn.startServer({
      name: "Servidor Moderno",
      port: v2Port,
      cors: true,
      routers: apiRouter.build(),
    });
    console.log("Servidor moderno v2 iniciado en:", v2Url);

    // ------------------------------------------------------------------------
    // TEST 3: Inyección Dinámica de Middleware y Rutas Adicionales
    // ------------------------------------------------------------------------
    console.log("\n[TEST 3] Inyectando middleware dinámico y lote de rutas adicionales...");
    let middlewareExecuted = false;
    dyn.use("Servidor Moderno", (req, res, next) => {
      middlewareExecuted = true;
      res.setHeader("X-Powered-By", "KyrnForge DynExpress v2");
      next();
    });

    dyn.addRoutes("Servidor Moderno", [
      {
        method: "get",
        path: "/metrics-test",
        handler: (req, res) => res.json({ status: "metrics ready" }),
      },
    ]);

    // ------------------------------------------------------------------------
    // TEST 4: Peticiones HTTP y Verificación de Cabeceras
    // ------------------------------------------------------------------------
    console.log("\n[TEST 4] Realizando peticiones HTTP...");
    const testGet = await fetch(`${v2Url}api/hello`);
    const dataGet = await testGet.json();
    console.log("Respuesta GET:", dataGet);
    console.log("Cabecera X-Powered-By:", testGet.headers.get("x-powered-by"));

    if (!middlewareExecuted) throw new Error("El middleware dinámico no se ejecutó");

    // Probar POST con JSON
    const testPost = await fetch(`${v2Url}api/echo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item: "Kyrnex Core", power: 100 }),
    });
    const dataPost = await testPost.json();
    console.log("Respuesta POST:", dataPost);

    // ------------------------------------------------------------------------
    // TEST 5: Telemetría y Estadísticas en Vivo
    // ------------------------------------------------------------------------
    console.log("\n[TEST 5] Verificando telemetría y métricas del servidor...");
    const stats = dyn.getServerStats("Servidor Moderno");
    console.log("Estadísticas en vivo:", {
      uptimeSeconds: stats.uptimeSeconds,
      totalRequests: stats.totalRequests,
      statusCodes: stats.statusCodes,
      activeSockets: stats.activeSockets,
    });

    if (stats.totalRequests < 2) {
      throw new Error(`Se esperaban al menos 2 peticiones en métricas, pero se contaron: ${stats.totalRequests}`);
    }

    // ------------------------------------------------------------------------
    // TEST 6: Introspección de Rutas
    // ------------------------------------------------------------------------
    console.log("\n[TEST 6] Verificando introspección de rutas registradas...");
    const routes = dyn.getRouteList("Servidor Moderno");
    console.log("Rutas registradas:", routes);

    // ------------------------------------------------------------------------
    // TEST 7: Cambio de Puerto en Caliente (rebindPort)
    // ------------------------------------------------------------------------
    console.log("\n[TEST 7] Probando cambio de puerto en caliente (rebindPort)...");
    const newPort = 3125;
    const rebindUrl = await dyn.rebindPort("Servidor Moderno", newPort);
    console.log("Servidor re-vinculado exitosamente a:", rebindUrl);

    const rebindCheck = await fetch(`${rebindUrl}api/hello`);
    const rebindData = await rebindCheck.json();
    console.log("Respuesta tras cambio de puerto:", rebindData);

    // ------------------------------------------------------------------------
    // TEST 8: Cierre Limpio (stopAll)
    // ------------------------------------------------------------------------
    console.log("\n[TEST 8] Probando dyn.stopAll()...");
    const stoppedCount = await dyn.stopAll();
    console.log(`Servidores detenidos limpiamente: ${stoppedCount}`);

    const remainingInstances = dyn.getAllServers();
    console.log("Servidores restantes activos:", remainingInstances.length);
    if (remainingInstances.length !== 0) throw new Error("Quedaron servidores activos");

    console.log("\n=======================================================");
    console.log(" ¡TODAS LAS PRUEBAS DE DYNEXPRESS v2.0 PASARON CON ÉXITO! ");
    console.log("=======================================================\n");
    setTimeout(() => {
      process.exit(0);
    }, 100);
  } catch (err) {
    console.error("ERROR EN SUITE v2.0:", err);
    process.exit(1);
  }
}

runV2Suite();
