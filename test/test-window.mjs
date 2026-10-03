import { app, BrowserWindow } from "electron";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.whenReady().then(async () => {
  console.log("=== INICIANDO VENTANA DE PRUEBA ===");
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: true,
    backgroundColor: "#0b0f17",
    webPreferences: {
      preload: path.join(__dirname, "../electron/preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.webContents.on("console-message", (e, level, msg, line, src) => {
    console.log(`[RENDERER CONSOLE]: ${msg} (línea ${line})`);
  });

  win.webContents.on("did-fail-load", (e, code, desc) => {
    console.log(`[FAIL LOAD]: ${desc} (${code})`);
  });

  const distPath = path.join(__dirname, "../dist/index.html");
  console.log("Cargando archivo:", distPath);

  try {
    await win.loadFile(distPath);
    console.log("loadFile resuelto correctamente");
  } catch (err) {
    console.error("Error en loadFile:", err);
  }

  setTimeout(() => {
    console.log("Comprobando si la ventana sigue abierta:", !win.isDestroyed());
    app.quit();
  }, 3000);
});
