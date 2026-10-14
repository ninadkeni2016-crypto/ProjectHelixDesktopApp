import path from "path";
import os from "os";
import fs from "fs/promises";
import fsSync from "fs";
import { validateSafePath } from "../controllers/fileController.js";
import { getSystemMetrics } from "../services/systemMonitor.js";
import { executeAutomationAction } from "../services/automationActions.js";

describe("Intelligent Desktop Companion Test Suite", () => {
  describe("1. Security: Path Validation & Isolation", () => {
    test("Accepts clean, absolute user file path", () => {
      const validPath = path.join(os.homedir(), "Documents", "report.pdf");
      const res = validateSafePath(validPath);
      expect(res.valid).toBe(true);
      expect(res.path).toBe(path.normalize(validPath));
    });

    test("Rejects relative paths without absolute root", () => {
      const res = validateSafePath("relative/folder/file.txt");
      expect(res.valid).toBe(false);
      expect(res.message).toMatch(/absolute/i);
    });

    test("Rejects directory traversal sequences ('..')", () => {
      const traversalPath = "C:\\Users\\Niaa\\Documents\\..\\..\\Windows\\System32";
      const res = validateSafePath(traversalPath);
      expect(res.valid).toBe(false);
      expect(res.message).toMatch(/traversal/i);
    });

    test("Rejects null-byte injection attempts", () => {
      const nullBytePath = path.join(os.homedir(), "file.txt\0.exe");
      const res = validateSafePath(nullBytePath);
      expect(res.valid).toBe(false);
      expect(res.message).toMatch(/null characters/i);
    });

    test("Blocks access to critical system directories (e.g. Windows System32)", () => {
      const systemPath = "C:\\Windows\\System32\\cmd.exe";
      const res = validateSafePath(systemPath);
      expect(res.valid).toBe(false);
      expect(res.message).toMatch(/restricted/i);
    });
  });

  describe("2. Monitoring Accuracy: Sensor Telemetry & N/A Handling", () => {
    test("Returns live metrics with real timestamp and correct N/A handling for absent sensors", async () => {
      const metrics = await getSystemMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.liveMetrics).toBeDefined();

      const live = metrics.liveMetrics;
      // Live metrics should have timestamp
      expect(live.timestamp).toBeDefined();
      expect(new Date(live.timestamp).getTime()).not.toBeNaN();

      // CPU and RAM should be numbers
      expect(typeof live.cpu).toBe("number");
      expect(typeof live.ram).toBe("number");

      // When temp is unavailable, it should be null, never misleading 0
      if (live.temp === null) {
        expect(live.temp).toBeNull();
      } else {
        expect(live.temp).toBeGreaterThan(0);
      }

      // When battery is not present, batteryPercent should be null, never misleading 0
      if (!live.hasBattery) {
        expect(live.batteryPercent).toBeNull();
      } else {
        expect(typeof live.batteryPercent).toBe("number");
      }
    }, 15000);
  });

  describe("3. Functional Automation Engine: Supported Actions", () => {
    test("Rejects unsupported automation actions", async () => {
      await expect(executeAutomationAction("arbitrary_unsupported_action", "fakeUser123"))
        .rejects.toThrow(/Unsupported automation action/i);
    });

    test("Executes 'cleanup_temp' safely on actual temp folder", async () => {
      const result = await executeAutomationAction("cleanup_temp", "fakeUser123");
      expect(result).toBeDefined();
      expect(result.action).toBe("cleanup_temp");
      expect(typeof result.filesCleaned).toBe("number");
      expect(typeof result.bytesReclaimed).toBe("number");
      expect(result.message).toBeDefined();
    });

    test("Executes 'organize_downloads' with real directory evaluation", async () => {
      const result = await executeAutomationAction("organize_downloads", "fakeUser123");
      expect(result).toBeDefined();
      expect(result.action).toBe("organize_downloads");
      expect(typeof result.filesOrganized).toBe("number");
      expect(result.message).toBeDefined();
    });

    test("Executes 'backup_index' and produces a verified file on disk", async () => {
      const result = await executeAutomationAction("backup_index", "testUser123");
      expect(result).toBeDefined();
      expect(result.action).toBe("backup_index");
      expect(result.backupFile).toBeDefined();
      expect(fsSync.existsSync(result.backupFile)).toBe(true);

      // Verify file size and clean up test artifact
      expect(result.backupBytes).toBeGreaterThan(0);
      await fs.unlink(result.backupFile).catch(() => {});
    });
  });
});
