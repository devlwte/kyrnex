import { NativeUpdater } from "../core/updater/NativeUpdater.mjs";
import assert from "node:assert";
import fsp from "node:fs/promises";
import path from "node:path";

console.log("=== INICIANDO PRUEBAS DE NATIVE UPDATER ===");

async function runTests() {
  const updater = new NativeUpdater({ currentVersion: "1.0.0" });

  // Test 1: SemVer comparison
  console.log("1. Probando comparación SemVer...");
  assert.strictEqual(updater.compareVersions("1.0.1", "1.0.0"), 1);
  assert.strictEqual(updater.compareVersions("1.0.0", "1.0.0"), 0);
  assert.strictEqual(updater.compareVersions("1.0.0", "1.0.1"), -1);
  assert.strictEqual(updater.compareVersions("v2.0.0", "1.9.9"), 1);
  assert.strictEqual(updater.compareVersions("1.1.0", "1.0.9"), 1);
  console.log("   SemVer comparison OK");

  // Test 2: Config persistence
  console.log("2. Probando persistencia de configuración de actualización...");
  const cfg = await updater.getConfig();
  assert.ok(cfg !== null);
  assert.strictEqual(typeof cfg.autoCheck, "boolean");

  await updater.saveConfig({ autoCheck: true, autoInstall: false });
  const updatedCfg = await updater.getConfig();
  assert.strictEqual(updatedCfg.autoCheck, true);
  assert.strictEqual(updatedCfg.autoInstall, false);
  console.log("   Config persistence OK");

  // Test 3: Remote GitHub version check
  console.log("3. Probando consulta al JSON remoto en GitHub...");
  const checkResult = await updater.checkForUpdates();
  assert.ok(checkResult);
  assert.strictEqual(typeof checkResult.hasUpdate, "boolean");
  assert.strictEqual(checkResult.currentVersion, "1.0.0");
  assert.ok(checkResult.feedUrl.includes("version_kyrnex.json"));
  console.log("   Remote feed check OK:", checkResult.latestVersion);

  // Test 4: Backup & Rollback simulation
  console.log("4. Probando creación de copia de seguridad y Rollback...");
  const backupDir = await updater.createBackup(["package.json"]);
  assert.ok(backupDir);
  const backupStat = await fsp.stat(path.join(backupDir, "package.json"));
  assert.ok(backupStat.size > 0);

  const rollbackSuccess = await updater.rollback(backupDir, ["package.json"]);
  assert.strictEqual(rollbackSuccess, true);
  console.log("   Backup & Rollback OK");

  console.log("=======================================================");
  console.log(" ¡TODAS LAS PRUEBAS DE NATIVE UPDATER PASARON CON ÉXITO! ");
  console.log("=======================================================");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
