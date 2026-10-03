/**
 * Test script to verify DynExpress integration and lifecycle
 */

import { dyn } from "dynexpress";
import { logger } from "../core/logger/Logger.mjs";

async function runTest() {
  console.log("=== INICIANDO PRUEBA DE DYNEXPRESS (FASE 1) ===");

  // Escuchar logs
  logger.on("log", (entry) => {
    // Los logs ya se imprimen en consola con color
  });

  // Escuchar eventos de ciclo de vida
  dyn.on("serverStarting", (info) => console.log("[EVENTO] serverStarting:", info));
  dyn.on("serverStarted", (info) => console.log("[EVENTO] serverStarted:", info));
  dyn.on("serverStopped", (info) => console.log("[EVENTO] serverStopped:", info));

  try {
    const testPort = 3088;
    console.log(`\n1. Probando disponibilidad de puerto ${testPort}...`);
    const isAvail = await dyn.isPortAvailable(testPort);
    console.log(`Puerto ${testPort} disponible:`, isAvail);

    console.log("\n2. Creando e iniciando servidor de prueba 'Servidor Test'...");
    const url = await dyn.newServer({
      name: "Servidor Test",
      port: testPort,
      routers: [
        {
          method: "get",
          path: "/",
          handler: (req, res) => {
            res.json({
              status: "ok",
              app: "Kyrnex Test Server",
              timestamp: new Date().toISOString(),
            });
          },
        },
      ],
      autoPortFallback: true,
    });

    console.log("Servidor iniciado en URL:", url);

    console.log("\n3. Verificando instancias activas...");
    const instances = dyn.getInstances();
    console.log("Instancias activas:", instances.map((i) => ({ name: i.name, port: i.port, url: i.url })));

    console.log("\n4. Realizando petición HTTP de prueba...");
    const response = await fetch(url);
    const data = await response.json();
    console.log("Respuesta recibida:", data);

    console.log("\n5. Deteniendo servidor...");
    await dyn.stopServer("Servidor Test");

    console.log("\n6. Verificando que el puerto se haya liberado...");
    const isAvailAfter = await dyn.isPortAvailable(testPort);
    console.log(`Puerto ${testPort} liberado correctamente:`, isAvailAfter);

    console.log("\n=== PRUEBA DE FASE 1 COMPLETADA CON ÉXITO ===");
    process.exit(0);
  } catch (error) {
    console.error("Error durante la prueba:", error);
    process.exit(1);
  }
}

runTest();
