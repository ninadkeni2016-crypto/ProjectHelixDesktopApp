import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import path from "path";
import fs from "fs";

import { configService } from "../config/configService.js";
import { validateSafePath } from "../controllers/fileController.js";
import { corsOriginValidator, ALLOWED_ORIGINS } from "../middleware/security.js";
import { generateGuestToken } from "../services/AuthService.js";

const PORT = configService.get("PORT") || 5000;
const BASE_URL = `http://localhost:${PORT}`;
const JWT_SECRET = configService.get("JWT_SECRET");

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

test("1. Reject request with missing Authorization header", async () => {
  const res = await makeRequest("/api/v1/monitor/current");
  assert.equal(res.status, 401);
  assert.equal(res.data.success, false);
});

test("2. Reject request with invalid / junk token", async () => {
  const res = await makeRequest("/api/v1/monitor/current", {
    headers: { Authorization: "Bearer this.is.not.a.valid.jwt" },
  });
  assert.equal(res.status, 401);
  assert.equal(res.data.success, false);
});

test("3. Reject request with tampered token (invalid signature)", async () => {
  // Sign with a rogue secret
  const rogueToken = jwt.sign({ id: "fake_user_id", role: "ADMIN" }, "rogue_untrusted_secret_key_1234567890");
  const res = await makeRequest("/api/v1/monitor/current", {
    headers: { Authorization: `Bearer ${rogueToken}` },
  });
  assert.equal(res.status, 401);
  assert.equal(res.data.success, false);
});

test("4. Reject request with expired token", async () => {
  // Token expired 10 minutes ago
  const expiredToken = jwt.sign(
    { id: "test_user_id", role: "USER", exp: Math.floor(Date.now() / 1000) - 600 },
    JWT_SECRET
  );
  const res = await makeRequest("/api/v1/monitor/current", {
    headers: { Authorization: `Bearer ${expiredToken}` },
  });
  assert.equal(res.status, 401);
  assert.equal(res.data.success, false);
  assert.equal(res.data.expired, true);
});

test("5. Rejection of hardcoded 'dev-token' bypass", async () => {
  const res = await makeRequest("/api/v1/monitor/current", {
    headers: { Authorization: "Bearer dev-token" },
  });
  assert.equal(res.status, 401, "dev-token bypass must return 401 Unauthorized");
  assert.equal(res.data.success, false);
});

test("6. Guest login generates isolated session with role GUEST and short expiry", async () => {
  const res = await makeRequest("/api/v1/auth/guest", { method: "POST" });
  assert.equal(res.status, 200);
  assert.equal(res.data.success, true);
  assert.ok(res.data.data.accessToken, "Must return signed accessToken");
  assert.equal(res.data.data.role, "GUEST");
  assert.equal(res.data.data.isGuest, true);

  // Verify guest token claims
  const decoded = jwt.verify(res.data.data.accessToken, JWT_SECRET);
  assert.equal(decoded.role, "GUEST");
  assert.equal(decoded.isGuest, true);
  assert.ok(decoded.exp - decoded.iat <= 86400, "Guest token expiry must be <= 24 hours");

  // Verify access with valid guest token to protected monitoring route
  const authRes = await makeRequest("/api/v1/monitor/current", {
    headers: { Authorization: `Bearer ${res.data.data.accessToken}` },
  });
  assert.equal(authRes.status, 200);
});

test("7. Path traversal validation strictly rejects dangerous paths", () => {
  // Path traversal with ..
  const test1 = validateSafePath("C:\\Users\\Niaa\\Desktop\\..\\..\\Windows\\System32");
  assert.equal(test1.valid, false);
  assert.ok(test1.message.includes("Path traversal"));

  // Relative path
  const test2 = validateSafePath("subfolder/file.txt");
  assert.equal(test2.valid, false);
  assert.ok(test2.message.includes("absolute"));

  // Null byte injection
  const test3 = validateSafePath("C:\\Users\\Niaa\\Desktop\\clean.txt\0.exe");
  assert.equal(test3.valid, false);
  assert.ok(test3.message.includes("null characters"));

  // Critical Windows system directories
  const test4 = validateSafePath("C:\\Windows\\System32\\cmd.exe");
  assert.equal(test4.valid, false);
  assert.ok(test4.message.includes("restricted"));

  const test5 = validateSafePath("C:\\Program Files\\app.exe");
  assert.equal(test5.valid, false);
  assert.ok(test5.message.includes("restricted"));

  // Safe valid path
  const testSafe = validateSafePath("C:\\Users\\Niaa\\Desktop\\ProjectHelixDesktopApp\\README.md");
  assert.equal(testSafe.valid, true);
});

test("8. CORS Origin Validator permits local dev & Electron, blocks untrusted origins", (t, done) => {
  corsOriginValidator("http://localhost:5173", (err, allowed) => {
    assert.equal(err, null);
    assert.equal(allowed, true);
  });

  corsOriginValidator("http://127.0.0.1:5173", (err, allowed) => {
    assert.equal(err, null);
    assert.equal(allowed, true);
  });

  // Requests from Electron desktop with null or undefined origin
  corsOriginValidator(undefined, (err, allowed) => {
    assert.equal(err, null);
    assert.equal(allowed, true);
  });

  // Untrusted external origin
  corsOriginValidator("https://malicious-website.attacker.com", (err, allowed) => {
    assert.ok(err instanceof Error);
    assert.ok(err.message.includes("CORS Policy"));
    done();
  });
});

test("9. Backup integrity verification detects tampering", async () => {
  // Generate a valid guest token for test
  const guestRes = await makeRequest("/api/v1/auth/guest", { method: "POST" });
  const token = guestRes.data.data.accessToken;

  // Run a real backup
  const backupRes = await makeRequest("/api/v1/dashboard/backup", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  assert.equal(backupRes.status, 200);
  assert.equal(backupRes.data.success, true);
  assert.ok(backupRes.data.sha256, "Must generate SHA-256 integrity hash");

  const backupFilename = backupRes.data.filename;
  const backupPath = backupRes.data.backupPath;
  assert.ok(fs.existsSync(backupPath), "Backup file must exist on disk");

  // Tamper with the backup file content
  const originalContent = fs.readFileSync(backupPath, "utf8");
  const parsed = JSON.parse(originalContent);
  parsed.filesCount = 999999; // Tampered count without recomputing manifest hash
  fs.writeFileSync(backupPath, JSON.stringify(parsed, null, 2), "utf8");

  // Attempt restore: must fail integrity check
  const restoreRes = await makeRequest("/api/v1/dashboard/backup/restore", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: { backupFilename, confirm: false },
  });

  assert.equal(restoreRes.status, 400);
  assert.ok(restoreRes.data.message.includes("integrity check failed"));

  // Restore original content & clean up test backup
  try {
    fs.unlinkSync(backupPath);
  } catch {}
});
