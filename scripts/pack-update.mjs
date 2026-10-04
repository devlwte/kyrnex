/**
 * Kyrnex Update Package Builder
 * Generates release/update.zip with zero external dependencies
 * Contains only the updated code files needed for hot code replacement.
 */

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const releaseDir = path.join(rootDir, "release");
const stageDir = path.join(releaseDir, "update_stage");
const updateZipPath = path.join(releaseDir, "update.zip");

async function buildUpdatePackage() {
  console.log("=== Construyendo paquete de actualización universal (update.zip) ===");

  // 1. Build frontend
  console.log("1. Compilando interfaz frontend con Vite...");
  execSync("npm run build", { cwd: rootDir, stdio: "inherit" });

  // 2. Prepare staging directory
  console.log("2. Preparando carpeta temporal de empaquetado...");
  if (fs.existsSync(stageDir)) {
    await fsp.rm(stageDir, { recursive: true, force: true });
  }
  await fsp.mkdir(stageDir, { recursive: true });

  // 3. Items to include in update.zip
  const items = [
    { src: "dist", isDir: true },
    { src: "core", isDir: true },
    { src: "electron", isDir: true },
    { src: "modules", isDir: true },
    { src: "package.json", isDir: false },
    { src: "src/config/app.config.json", isDir: false, dest: "src/config/app.config.json" },
  ];

  for (const item of items) {
    const srcPath = path.join(rootDir, item.src);
    const destRel = item.dest || item.src;
    const destPath = path.join(stageDir, destRel);

    if (fs.existsSync(srcPath)) {
      const parentDir = path.dirname(destPath);
      if (!fs.existsSync(parentDir)) {
        await fsp.mkdir(parentDir, { recursive: true });
      }

      if (item.isDir) {
        await fsp.cp(srcPath, destPath, { recursive: true });
      } else {
        await fsp.copyFile(srcPath, destPath);
      }
      console.log(`  + Incluido: ${item.src}`);
    } else {
      console.warn(`  ! Advertencia: no se encontró ${item.src}`);
    }
  }

  // 4. Compress stageDir into release/update.zip
  console.log("3. Comprimiendo archivos en release/update.zip...");
  if (fs.existsSync(updateZipPath)) {
    await fsp.rm(updateZipPath, { force: true });
  }

  // Use PowerShell Compress-Archive
  const psCmd = `Compress-Archive -Path "${stageDir}\\*" -DestinationPath "${updateZipPath}" -Force`;
  execSync(`powershell -NoProfile -Command "${psCmd}"`, { stdio: "inherit" });

  // 5. Clean up staging directory
  await fsp.rm(stageDir, { recursive: true, force: true });

  const stat = await fsp.stat(updateZipPath);
  const sizeMb = (stat.size / (1024 * 1024)).toFixed(2);
  console.log(`\n¡Éxito! Paquete generado en: ${updateZipPath}`);
  console.log(`Tamaño: ${sizeMb} MB (${stat.size} bytes)`);
}

buildUpdatePackage().catch((err) => {
  console.error("Error al construir update.zip:", err);
  process.exit(1);
});
