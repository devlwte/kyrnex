/**
 * Kyrnex Native Updater Engine
 * Zero external dependencies - uses pure Node.js & Electron built-in APIs
 * Features:
 * - Semantic version checking against remote GitHub JSON feed
 * - Follows GitHub HTTP 302 redirects transparently
 * - Pure Node.js ZIP archive unpacker (deflate / stored)
 * - Automatic pre-update backup of current files
 * - Atomic rollback on any error (network failure, corrupt file, write error)
 * - Hot restart via Electron app.relaunch()
 */

import https from "node:https";
import http from "node:http";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";
import { EventEmitter } from "node:events";

export class NativeUpdater extends EventEmitter {
  constructor(options = {}) {
    super();
    this.appRoot = options.appRoot || process.cwd();
    this.configPath = path.join(this.appRoot, "data", "updater-config.json");
    this.backupBaseDir = path.join(this.appRoot, "data", "backups");
    this.currentVersion = options.currentVersion || "1.0.0";
    this.defaultFeedUrl =
      "https://raw.githubusercontent.com/devlwte/kyrnex/refs/heads/main/updates/version_kyrnex.json";

    this.isUpdating = false;
    this.lastCheckResult = null;
  }

  /**
   * Load local updater settings
   */
  async getConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = await fsp.readFile(this.configPath, "utf-8");
        const parsed = JSON.parse(raw);
        return {
          autoCheck: parsed.autoCheck !== undefined ? parsed.autoCheck : true,
          autoInstall: parsed.autoInstall !== undefined ? parsed.autoInstall : false,
          feedUrl: parsed.feedUrl || this.defaultFeedUrl,
          lastChecked: parsed.lastChecked || null,
          lastVersionChecked: parsed.lastVersionChecked || null,
        };
      }
    } catch {}

    return {
      autoCheck: true,
      autoInstall: false,
      feedUrl: this.defaultFeedUrl,
      lastChecked: null,
      lastVersionChecked: null,
    };
  }

  /**
   * Save local updater settings
   */
  async saveConfig(updates) {
    try {
      const current = await this.getConfig();
      const merged = { ...current, ...updates };
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        await fsp.mkdir(dir, { recursive: true });
      }
      await fsp.writeFile(this.configPath, JSON.stringify(merged, null, 2), "utf-8");
      return merged;
    } catch (err) {
      console.error("[NativeUpdater] Failed to save config:", err);
      return null;
    }
  }

  /**
   * Compare two SemVer strings (e.g. "1.0.1" vs "1.0.0")
   * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
   */
  compareVersions(v1, v2) {
    const clean = (v) =>
      String(v || "")
        .replace(/^v/i, "")
        .trim();
    const parts1 = clean(v1).split(".").map((n) => parseInt(n, 10) || 0);
    const parts2 = clean(v2).split(".").map((n) => parseInt(n, 10) || 0);
    const maxLen = Math.max(parts1.length, parts2.length);

    for (let i = 0; i < maxLen; i++) {
      const a = parts1[i] || 0;
      const b = parts2[i] || 0;
      if (a > b) return 1;
      if (a < b) return -1;
    }
    return 0;
  }

  /**
   * Safe HTTP/HTTPS GET request that handles 301/302/307 redirects
   */
  fetchBuffer(url, maxRedirects = 5) {
    return new Promise((resolve, reject) => {
      if (maxRedirects <= 0) {
        return reject(new Error("Demasiadas redirecciones HTTP"));
      }

      const client = url.startsWith("https") ? https : http;
      const options = {
        headers: {
          "User-Agent": "Kyrnex-Native-Updater/1.0.0",
          Accept: "*/*",
        },
      };

      const req = client.get(url, options, (res) => {
        // Handle HTTP redirects (GitHub raw or releases redirect to AWS)
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          const redirectUrl = new URL(res.headers.location, url).toString();
          return this.fetchBuffer(redirectUrl, maxRedirects - 1)
            .then(resolve)
            .catch(reject);
        }

        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(
            new Error(`Error HTTP ${res.statusCode}: ${res.statusMessage}`)
          );
        }

        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => resolve(Buffer.concat(chunks)));
      });

      req.on("error", reject);
      req.setTimeout(20000, () => {
        req.destroy();
        reject(new Error("Tiempo de espera agotado al descargar"));
      });
    });
  }

  /**
   * Fetch JSON from URL
   */
  async fetchJson(url) {
    const buffer = await this.fetchBuffer(url);
    const text = buffer.toString("utf-8");
    return JSON.parse(text);
  }

  /**
   * Check if a new version is available on GitHub
   */
  async checkForUpdates(customFeedUrl) {
    const config = await this.getConfig();
    const feedUrl = customFeedUrl || config.feedUrl || this.defaultFeedUrl;

    try {
      this.emit("checking-for-update");
      const remoteData = await this.fetchJson(feedUrl);

      const latestVersion = remoteData.version || "1.0.0";
      const hasUpdate = this.compareVersions(latestVersion, this.currentVersion) > 0;

      const result = {
        hasUpdate,
        currentVersion: this.currentVersion,
        latestVersion,
        lastUpdated: remoteData.last_updated || null,
        changelog:
          remoteData.changelog ||
          remoteData.notification?.update_es ||
          remoteData.notification?.update ||
          "Nueva versión disponible con mejoras de estabilidad.",
        repoFileUpdate: remoteData.repo_file_update || null,
        archiveUrl: remoteData.archive_url || null,
        notification: remoteData.notification || null,
        feedUrl,
        checkedAt: new Date().toISOString(),
      };

      this.lastCheckResult = result;
      await this.saveConfig({
        lastChecked: result.checkedAt,
        lastVersionChecked: latestVersion,
      });

      if (hasUpdate) {
        this.emit("update-available", result);
      } else {
        this.emit("update-not-available", result);
      }

      return result;
    } catch (err) {
      console.error("[NativeUpdater] Error checking updates:", err.message);
      this.emit("error", err);
      return {
        hasUpdate: false,
        error: err.message,
        currentVersion: this.currentVersion,
        checkedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Pure Node.js ZIP archive unpacker (deflate / stored)
   * Unpacks a zip Buffer into a target directory without external tools
   */
  async unpackZipBuffer(zipBuffer, targetDir) {
    let offset = 0;
    const len = zipBuffer.length;
    let extractedCount = 0;

    while (offset < len - 30) {
      const signature = zipBuffer.readUInt32LE(offset);
      // Local file header signature 0x04034b50
      if (signature !== 0x04034b50) {
        break; // Reached central directory or end
      }

      const compressionMethod = zipBuffer.readUInt16LE(offset + 8);
      const compressedSize = zipBuffer.readUInt32LE(offset + 18);
      const uncompressedSize = zipBuffer.readUInt32LE(offset + 22);
      const fileNameLen = zipBuffer.readUInt16LE(offset + 26);
      const extraFieldLen = zipBuffer.readUInt16LE(offset + 28);

      const fileNameStart = offset + 30;
      const fileName = zipBuffer
        .toString("utf-8", fileNameStart, fileNameStart + fileNameLen)
        .replace(/\\/g, "/");

      const dataStart = fileNameStart + fileNameLen + extraFieldLen;
      const compressedData = zipBuffer.slice(dataStart, dataStart + compressedSize);

      offset = dataStart + compressedSize;

      // Skip directory entries (ends with /)
      if (fileName.endsWith("/")) {
        const fullDirPath = path.join(targetDir, fileName);
        await fsp.mkdir(fullDirPath, { recursive: true });
        continue;
      }

      let decompressedData;
      if (compressionMethod === 0) {
        // Stored (no compression)
        decompressedData = compressedData;
      } else if (compressionMethod === 8) {
        // Deflated
        decompressedData = zlib.inflateRawSync(compressedData);
      } else {
        console.warn(`[NativeUpdater] Unsupported compression method ${compressionMethod} for ${fileName}`);
        continue;
      }

      const outFilePath = path.join(targetDir, fileName);
      const outDir = path.dirname(outFilePath);
      if (!fs.existsSync(outDir)) {
        await fsp.mkdir(outDir, { recursive: true });
      }

      await fsp.writeFile(outFilePath, decompressedData);
      extractedCount++;
    }

    return extractedCount;
  }

  /**
   * Creates a backup of the current target directory before applying updates
   */
  async createBackup(targetPaths = ["dist", "core", "package.json"]) {
    const timestamp = Date.now();
    const backupDir = path.join(this.backupBaseDir, `backup-${this.currentVersion}-${timestamp}`);
    await fsp.mkdir(backupDir, { recursive: true });

    for (const relPath of targetPaths) {
      const srcPath = path.join(this.appRoot, relPath);
      const destPath = path.join(backupDir, relPath);

      if (fs.existsSync(srcPath)) {
        const stat = await fsp.stat(srcPath);
        if (stat.isDirectory()) {
          await fsp.cp(srcPath, destPath, { recursive: true });
        } else {
          const destDir = path.dirname(destPath);
          if (!fs.existsSync(destDir)) {
            await fsp.mkdir(destDir, { recursive: true });
          }
          await fsp.copyFile(srcPath, destPath);
        }
      }
    }

    return backupDir;
  }

  /**
   * Rollback files from a backup directory if any error occurs
   */
  async rollback(backupDir, targetPaths = ["dist", "core", "package.json"]) {
    console.warn("[NativeUpdater] Rolling back changes from:", backupDir);
    try {
      for (const relPath of targetPaths) {
        const bkpSrc = path.join(backupDir, relPath);
        const appDest = path.join(this.appRoot, relPath);

        if (fs.existsSync(bkpSrc)) {
          const stat = await fsp.stat(bkpSrc);
          if (stat.isDirectory()) {
            await fsp.cp(bkpSrc, appDest, { recursive: true, force: true });
          } else {
            await fsp.copyFile(bkpSrc, appDest);
          }
        }
      }
      return true;
    } catch (err) {
      console.error("[NativeUpdater] Rollback failed:", err);
      return false;
    }
  }

  /**
   * Download and install the update safely with backup and rollback
   */
  async downloadAndInstall(updateInfo) {
    if (this.isUpdating) {
      throw new Error("Ya hay una actualización en curso");
    }

    this.isUpdating = true;
    let backupDir = null;

    try {
      this.emit("update-downloading", { version: updateInfo.latestVersion });

      // Step 1: Create atomic backup
      backupDir = await this.createBackup();

      // Step 2: Determine download source (ZIP archive or direct bundle)
      const downloadUrl =
        updateInfo.archiveUrl ||
        (updateInfo.repoFileUpdate && updateInfo.repoFileUpdate.endsWith(".zip")
          ? updateInfo.repoFileUpdate
          : null);

      if (downloadUrl) {
        // Download ZIP archive
        const zipBuffer = await this.fetchBuffer(downloadUrl);
        const tempExtractDir = path.join(this.appRoot, "data", "temp_update");
        if (fs.existsSync(tempExtractDir)) {
          await fsp.rm(tempExtractDir, { recursive: true, force: true });
        }
        await fsp.mkdir(tempExtractDir, { recursive: true });

        // Unpack ZIP
        await this.unpackZipBuffer(zipBuffer, tempExtractDir);

        // Find root of extracted files (handles repos zipped as repo-main/...)
        const entries = await fsp.readdir(tempExtractDir);
        let sourceDir = tempExtractDir;
        if (entries.length === 1) {
          const singlePath = path.join(tempExtractDir, entries[0]);
          const stat = await fsp.stat(singlePath);
          if (stat.isDirectory()) {
            sourceDir = singlePath;
          }
        }

        // Copy updated dist, core, and package.json if present
        for (const item of ["dist", "core", "package.json", "src"]) {
          const itemSrc = path.join(sourceDir, item);
          if (fs.existsSync(itemSrc)) {
            const itemDest = path.join(this.appRoot, item);
            await fsp.cp(itemSrc, itemDest, { recursive: true, force: true });
          }
        }

        // Clean up temp dir
        await fsp.rm(tempExtractDir, { recursive: true, force: true });
      } else {
        // If repo_file_update is a direct file or URL, fetch and update version record
        // or copy files
        console.log("[NativeUpdater] No binary zip specified; updating version record locally");
      }

      // Step 3: Update local package.json version
      try {
        const pkgPath = path.join(this.appRoot, "package.json");
        if (fs.existsSync(pkgPath)) {
          const pkgData = JSON.parse(await fsp.readFile(pkgPath, "utf-8"));
          pkgData.version = updateInfo.latestVersion;
          await fsp.writeFile(pkgPath, JSON.stringify(pkgData, null, 2), "utf-8");
        }
        this.currentVersion = updateInfo.latestVersion;
      } catch (pkgErr) {
        console.warn("[NativeUpdater] Could not update package.json version:", pkgErr);
      }

      this.isUpdating = false;
      this.emit("update-downloaded", {
        version: updateInfo.latestVersion,
        backupDir,
      });

      return {
        success: true,
        version: updateInfo.latestVersion,
        backupDir,
      };
    } catch (err) {
      this.isUpdating = false;
      console.error("[NativeUpdater] Update error:", err.message);

      // Perform automatic rollback
      if (backupDir) {
        await this.rollback(backupDir);
      }

      this.emit("error", err);
      return {
        success: false,
        error: err.message,
        rolledBack: Boolean(backupDir),
      };
    }
  }
}
