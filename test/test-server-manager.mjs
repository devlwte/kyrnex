import { serverManager } from "../core/manager/ServerManager.mjs";
import path from "path";
import fs from "fs";

async function test() {
  console.log("=== PROBANDO SERVER MANAGER ===");
  const initialServers = serverManager.getAllServers();
  console.log("Servidores iniciales cargados:", initialServers.length);

  // Crear carpeta temporal para prueba si no existe
  const tempDir = path.join(process.cwd(), "test", "_temp_server_test");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  fs.writeFileSync(path.join(tempDir, "index.html"), "<h1>TEST KYRNEX SERVER</h1>", "utf8");

  console.log("\n1. Creando servidor temporal...");
  const created = await serverManager.createServer({
    name: "Servidor Temporal Test",
    port: 3299,
    rootDir: tempDir,
    publicDir: "",
    mainFile: "index.html",
    autoStart: false,
    type: "static",
  });

  console.log("Servidor creado:", created.id, created.name, "en puerto", created.port);

  console.log("\n2. Iniciando servidor temporal...");
  const url = await serverManager.startServer(created.id);
  console.log("Servidor iniciado en:", url);

  const res = await fetch(url);
  const text = await res.text();
  console.log(`Respuesta HTTP recibida: ${text}`);
  if (!text.includes("TEST KYRNEX SERVER")) {
    throw new Error("El contenido no coincide");
  }

  console.log("\n3. Deteniendo servidor temporal...");
  await serverManager.stopServer(created.id);
  console.log("Servidor detenido exitosamente.");

  console.log("\n4. Eliminando servidor temporal...");
  await serverManager.deleteServer(created.id);

  // Limpiar carpeta temporal
  fs.rmSync(tempDir, { recursive: true, force: true });

  serverManager.cleanup();
  console.log("=== PRUEBA DE SERVER MANAGER EXITOSA ===");
  process.exit(0);
}

test().catch((err) => {
  console.error("Fallo:", err);
  process.exit(1);
});
