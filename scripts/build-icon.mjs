import fs from "fs";
import path from "path";
import sharp from "sharp";
import pngToIco from "png-to-ico";

// Diseño oficial Kyrnex: Icono de Servidor de 3 niveles idéntico al enviado por el usuario,
// con bordes ultra nítidos, sin halos ni residuos que sobresalgan del squircle exterior,
// y 100% transparencia alfa nativa en las esquinas.
const KYRNEX_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#141824"/>
      <stop offset="100%" stop-color="#0b0e17"/>
    </linearGradient>
  </defs>

  <!-- Squircle perfectamente delimitado con transparencia alfa nativa (cero residuos en esquinas) -->
  <rect x="24" y="24" width="464" height="464" rx="104" ry="104" fill="url(#bgGrad)" stroke="#1e2436" stroke-width="1.5"/>

  <!-- SERVIDOR 1 (Superior) -->
  <rect x="98" y="112" width="316" height="82" rx="26" ry="26" fill="#0c0f18" stroke="#ffffff" stroke-width="12"/>
  <!-- 3 Ranuras de ventilación verticales blancas -->
  <rect x="134" y="132" width="11" height="42" rx="5.5" ry="5.5" fill="#ffffff"/>
  <rect x="156" y="132" width="11" height="42" rx="5.5" ry="5.5" fill="#ffffff"/>
  <rect x="178" y="132" width="11" height="42" rx="5.5" ry="5.5" fill="#ffffff"/>
  <!-- LEDs: Cian y Blanco -->
  <circle cx="336" cy="153" r="11" fill="#00c6ff"/>
  <circle cx="368" cy="153" r="11" fill="#ffffff"/>

  <!-- SERVIDOR 2 (Medio) -->
  <rect x="98" y="215" width="316" height="82" rx="26" ry="26" fill="#0c0f18" stroke="#ffffff" stroke-width="12"/>
  <!-- 3 Ranuras de ventilación verticales blancas -->
  <rect x="134" y="235" width="11" height="42" rx="5.5" ry="5.5" fill="#ffffff"/>
  <rect x="156" y="235" width="11" height="42" rx="5.5" ry="5.5" fill="#ffffff"/>
  <rect x="178" y="235" width="11" height="42" rx="5.5" ry="5.5" fill="#ffffff"/>
  <!-- LEDs: Rojo y Blanco -->
  <circle cx="336" cy="256" r="11" fill="#fe3838"/>
  <circle cx="368" cy="256" r="11" fill="#ffffff"/>

  <!-- SERVIDOR 3 (Inferior) -->
  <rect x="98" y="318" width="316" height="82" rx="26" ry="26" fill="#0c0f18" stroke="#ffffff" stroke-width="12"/>
  <!-- 3 Ranuras de ventilación verticales blancas -->
  <rect x="134" y="338" width="11" height="42" rx="5.5" ry="5.5" fill="#ffffff"/>
  <rect x="156" y="338" width="11" height="42" rx="5.5" ry="5.5" fill="#ffffff"/>
  <rect x="178" y="338" width="11" height="42" rx="5.5" ry="5.5" fill="#ffffff"/>
  <!-- LEDs: Verde y Blanco -->
  <circle cx="336" cy="359" r="11" fill="#00eb72"/>
  <circle cx="368" cy="359" r="11" fill="#ffffff"/>
</svg>
`;

async function buildOfficialKyrnexIcons() {
  console.log("=== COMPILANDO ICONO OFICIAL KYRNEX (VECTOR LIMPIO SIN RESIDUOS) ===");

  const assetsDir = path.join(process.cwd(), "assets");
  const publicDir = path.join(process.cwd(), "public");

  if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  const svgBuffer = Buffer.from(KYRNEX_ICON_SVG);

  // 1. Guardar SVG vectorial puro
  console.log("1. Guardando formato .svg vectorial...");
  const outSvg = path.join(assetsDir, "icon.svg");
  fs.writeFileSync(outSvg, KYRNEX_ICON_SVG, "utf8");
  fs.writeFileSync(path.join(publicDir, "icon.svg"), KYRNEX_ICON_SVG, "utf8");
  console.log("✓ Guardado en assets/icon.svg y public/icon.svg");

  // 2. Generar Master PNG 1024x1024 Ultra-HD
  console.log("\n2. Renderizando PNG 1024x1024 Ultra-HD...");
  const png1024Buffer = await sharp(svgBuffer, { density: 300 })
    .resize(1024, 1024)
    .png({ compressionLevel: 9 })
    .toBuffer();
  fs.writeFileSync(path.join(assetsDir, "icon-1024.png"), png1024Buffer);
  console.log("✓ Guardado en assets/icon-1024.png");

  // 3. Generar icon.png 512x512 para Electron
  console.log("\n3. Generando icon.png 512x512...");
  const png512Buffer = await sharp(svgBuffer, { density: 300 })
    .resize(512, 512)
    .png({ compressionLevel: 9 })
    .toBuffer();
  fs.writeFileSync(path.join(assetsDir, "icon.png"), png512Buffer);
  fs.writeFileSync(path.join(publicDir, "icon.png"), png512Buffer);
  console.log("✓ Guardado en assets/icon.png y public/icon.png");

  // 4. Generar archivo .ico multi-resolución con 8 tamaños de Windows
  console.log("\n4. Generando icon.ico con todos los tamaños oficiales de Windows...");
  const icoSizes = [256, 128, 96, 64, 48, 32, 24, 16];
  const pngBuffersForIco = [];

  for (const size of icoSizes) {
    const resized = await sharp(svgBuffer, { density: 300 })
      .resize(size, size)
      .png()
      .toBuffer();
    pngBuffersForIco.push(resized);
    console.log(`  - Capa ${size}x${size} RGBA generada`);
  }

  const icoBuffer = await pngToIco(pngBuffersForIco);
  const outIco = path.join(assetsDir, "icon.ico");
  fs.writeFileSync(outIco, icoBuffer);
  fs.writeFileSync(path.join(publicDir, "icon.ico"), icoBuffer);
  fs.writeFileSync(path.join(publicDir, "favicon.ico"), icoBuffer);
  console.log("✓ Archivo icon.ico guardado en assets/ y public/");

  // 5. Limpiar carpetas temporales de propuestas
  const tempFolders = ["proposals", "proposals_k", "proposals_k2"];
  for (const f of tempFolders) {
    const p = path.join(assetsDir, f);
    if (fs.existsSync(p)) {
      try {
        fs.rmSync(p, { recursive: true, force: true });
      } catch {}
    }
  }

  console.log("\n=========================================");
  console.log("✅ ICONOS OFICIALES KYRNEX COMPILADOS CON ÉXITO");
  console.log("=========================================");
}

buildOfficialKyrnexIcons().catch((err) => {
  console.error("Error al construir iconos:", err);
  process.exit(1);
});
