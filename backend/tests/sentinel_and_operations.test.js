import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "fs";
import path from "path";
import os from "os";

import { configService } from "../config/configService.js";

const PORT = configService.get("PORT") || 5000;
const BASE_URL = `http://localhost:${PORT}`;

function makeRequest(endpoint, { method = "GET", headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
    const reqHeaders = { ...headers };
    let reqBody = null;

    if (body) {
      reqBody = typeof body === "string" ? body : JSON.stringify(body);
      reqHeaders["Content-Type"] = "application/json";
      reqHeaders["Content-Length"] = Buffer.byteLength(reqBody);
    }

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: reqHeaders,
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, data });
        }
      });
    });

    req.on("error", reject);
    if (reqBody) req.write(reqBody);
    req.end();
  });
}

test("Sentinel & Operations End-to-End Test Suite", async (t) => {
  // Step 1: Login as guest to obtain auth token
  const guestRes = await makeRequest("/api/v1/auth/guest", { method: "POST" });
  assert.equal(guestRes.status, 200);
  const token = guestRes.data.data.accessToken;
  const authHeaders = { Authorization: `Bearer ${token}` };

  // Setup temporary test directory for Sentinel monitoring
  const testDir = path.join(os.tmpdir(), `helix_sentinel_test_${Date.now()}`);
  fs.mkdirSync(testDir, { recursive: true });
  const file1 = path.join(testDir, "document1.txt");
  const file2 = path.join(testDir, "document2.txt");
  fs.writeFileSync(file1, "Original content for document 1", "utf8");
  fs.writeFileSync(file2, "Original content for document 2", "utf8");

  let monitoredFolderId = null;

  await t.test("1. Register directory in Helix Sentinel and verify SHA-256 baseline", async () => {
    const res = await makeRequest("/api/v1/sentinel/folders", {
      method: "POST",
      headers: authHeaders,
      body: { path: testDir, name: "Test Monitoring Dir" },
    });

    assert.equal(res.status, 201);
    assert.equal(res.data.success, true);
    assert.equal(res.data.folder.baselineFileCount, 2);
    monitoredFolderId = res.data.folder._id;
  });

  await t.test("2. Verify Sentinel status and Security Health Score", async () => {
    const res = await makeRequest("/api/v1/sentinel/status", {
      headers: authHeaders,
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.ok(typeof res.data.score === "number");
    assert.ok(res.data.monitoredFoldersCount >= 1);
  });

  await t.test("3. Modify a monitored file and verify FIM detects change and generates explainable alert", async () => {
    // Tamper / modify document1.txt
    fs.appendFileSync(file1, "\nSuspicious unexpected modification!");

    const scanRes = await makeRequest(`/api/v1/sentinel/folders/${monitoredFolderId}/scan`, {
      method: "POST",
      headers: authHeaders,
    });

    assert.equal(scanRes.status, 200);
    assert.equal(scanRes.data.status, "modified");
    assert.ok(scanRes.data.modifiedCount >= 1);

    // Verify explainable alert was created in MongoDB
    const alertsRes = await makeRequest("/api/v1/sentinel/alerts", {
      headers: authHeaders,
    });

    assert.equal(alertsRes.status, 200);
    assert.ok(alertsRes.data.alerts.length >= 1);

    const alert = alertsRes.data.alerts.find(a => a.affectedPath && a.affectedPath.includes("document1.txt"));
    assert.ok(alert, "Must generate explainable alert for modified document1.txt");
    assert.equal(alert.category.toLowerCase(), "file_integrity");
    assert.ok(alert.explanation, "Must provide human-readable explanation");
    assert.ok(alert.evidence, "Must capture evidence");
    assert.ok(alert.recommendedAction, "Must suggest actionable recommendation");
    assert.ok(typeof alert.confidenceScore === "number");

    // Test Acknowledging alert
    const ackRes = await makeRequest(`/api/v1/sentinel/alerts/${alert._id}/acknowledge`, {
      method: "POST",
      headers: authHeaders,
    });
    assert.equal(ackRes.status, 200);
    assert.equal(ackRes.data.alert.status, "acknowledged");
  });

  await t.test("4. Duplicate file cleanup requires explicit confirmation", async () => {
    // Attempting delete without confirm: true must fail or return requiresConfirmation
    const unconfirmedRes = await makeRequest("/api/v1/dashboard/duplicates/delete", {
      method: "POST",
      headers: authHeaders,
      body: { fileIds: ["non_existent_id"], confirm: false },
    });

    assert.equal(unconfirmedRes.status, 400);
    assert.ok(
      unconfirmedRes.data.requiresConfirmation === true ||
      unconfirmedRes.data.message.includes("confirmation")
    );
  });

  await t.test("5. Backup restore requires preview verification first", async () => {
    // Create real backup first
    const backupRes = await makeRequest("/api/v1/dashboard/backup", {
      method: "POST",
      headers: authHeaders,
    });
    assert.equal(backupRes.status, 200);
    const backupFilename = backupRes.data.filename;
    const backupPath = backupRes.data.backupPath;

    // Send restore request with confirm: false
    const previewRes = await makeRequest("/api/v1/dashboard/backup/restore", {
      method: "POST",
      headers: authHeaders,
      body: { backupFilename, confirm: false },
    });

    assert.equal(previewRes.status, 200);
    assert.equal(previewRes.data.requiresConfirmation, true);
    assert.ok(Array.isArray(previewRes.data.preview));
    assert.ok(typeof previewRes.data.totalFiles === "number");

    // Clean up test backup file
    try {
      if (backupPath && fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
      }
    } catch {}
  });

  // Cleanup temporary test directory
  try {
    fs.rmSync(testDir, { recursive: true, force: true });
  } catch {}
});
