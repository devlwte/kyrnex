import { app, BrowserWindow } from "electron";
import fs from "fs";
import path from "path";
import { serverManager } from "../core/manager/ServerManager.mjs";

app.whenReady().then(async () => {
  console.log("=== PROBANDO CAPTURA NATIVA OFFSCREEN DE ELECTRON ===");
  try {
    console.log("1. Iniciando Servidor Principal...");
    const url = await serverManager.startServer("srv-principal");
    console.log("Servidor activo en:", url);

    console.log("2. Creando ventana offscreen para captura...");
    const offscreenWin = new BrowserWindow({
      width: 1280,
      height: 720,
      show: false,
      webPreferences: {
        offscreen: true,
      },
    });

    offscreenWin.webContents.on("did-finish-load", async () => {
      console.log("3. Página cargada en offscreen. Esperando renderizado...");
      setTimeout(async () => {
        try {
          const image = await offscreenWin.webContents.capturePage();
          const buffer = image.toPNG();
          console.log(`4. Captura exitosa. Tamaño del buffer PNG: ${buffer.length} bytes`);

          const outPath = path.join(process.cwd(), "data", "previews", "srv-principal.png");
          fs.writeFileSync(outPath, buffer);
          console.log("5. Guardado en caché:", outPath);

          offscreenWin.destroy();
          await serverManager.stopServer("srv-principal");
          serverManager.cleanup();

          console.log("=== PRUEBA DE CAPTURA COMPLETADA CON ÉXITO ===");
          app.quit();
        } catch (err) {
          console.error("Error en captura:", err);
          app.quit();
        }
      }, 500);
    });

    await offscreenWin.loadURL(url);
  } catch (error) {
    console.error("Error general:", error);
    app.quit();
  }
});
