import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import jwt from "jsonwebtoken";
import { configService } from "../config/configService.js";

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

test("Project Helix Auth, Chat History & Search History API", async (t) => {
  const testUserId = "66a01234567890abcdef1234";
  const validToken = jwt.sign({ id: testUserId, role: "USER" }, JWT_SECRET, { expiresIn: "1h" });

  await t.test("Protected Route Security", async (st) => {
    await st.test("should reject GET /api/v1/auth/me without token", async () => {
      const res = await makeRequest("/api/v1/auth/me");
      assert.equal(res.status, 401);
      assert.equal(res.data.success, false);
    });

    await st.test("should reject GET /api/v1/ai/conversations without token", async () => {
      const res = await makeRequest("/api/v1/ai/conversations");
      assert.equal(res.status, 401);
      assert.equal(res.data.success, false);
    });

    await st.test("should reject POST /api/v1/ai/chat without token", async () => {
      const res = await makeRequest("/api/v1/ai/chat", {
        method: "POST",
        body: { text: "Hello AI" },
      });
      assert.equal(res.status, 401);
      assert.equal(res.data.success, false);
    });

    await st.test("should reject GET /api/v1/ai/search/history without token", async () => {
      const res = await makeRequest("/api/v1/ai/search/history");
      assert.equal(res.status, 401);
      assert.equal(res.data.success, false);
    });

    await st.test("should reject GET /api/v1/activities without token", async () => {
      const res = await makeRequest("/api/v1/activities");
      assert.equal(res.status, 401);
      assert.equal(res.data.success, false);
    });

    await st.test("should reject requests with invalid token signature", async () => {
      const res = await makeRequest("/api/v1/auth/me", {
        headers: { Authorization: "Bearer invalid.signature.token" },
      });
      assert.equal(res.status, 401);
      assert.equal(res.data.success, false);
    });
  });

  await t.test("Auth Validation", async (st) => {
    await st.test("should reject registration with missing email", async () => {
      const res = await makeRequest("/api/v1/auth/register", {
        method: "POST",
        body: { name: "Alex", password: "password123" },
      });
      assert.equal(res.status, 400);
      assert.equal(res.data.success, false);
    });

    await st.test("should reject registration with short password", async () => {
      const res = await makeRequest("/api/v1/auth/register", {
        method: "POST",
        body: { name: "Alex", email: "alex@helix.test", password: "123" },
      });
      assert.equal(res.status, 400);
      assert.equal(res.data.success, false);
    });

    await st.test("should reject login with missing credentials", async () => {
      const res = await makeRequest("/api/v1/auth/login", {
        method: "POST",
        body: { email: "invalid@helix.test" },
      });
      assert.equal(res.status, 400);
      assert.equal(res.data.success, false);
    });
  });

  await t.test("Authenticated Endpoints & Session Management", async (st) => {
    await st.test("should allow verified token on /api/v1/ai/search/history", async () => {
      const res = await makeRequest("/api/v1/ai/search/history", {
        headers: { Authorization: `Bearer ${validToken}` },
      });
      assert.ok([200, 500].includes(res.status));
      if (res.status === 200) {
        assert.equal(res.data.success, true);
        assert.ok(Array.isArray(res.data.data));
      }
    });

    await st.test("should allow verified token on /api/v1/activities", async () => {
      const res = await makeRequest("/api/v1/activities", {
        headers: { Authorization: `Bearer ${validToken}` },
      });
      assert.ok([200, 500].includes(res.status));
      if (res.status === 200) {
        assert.ok(Array.isArray(res.data));
      }
    });

    await st.test("should allow user logout", async () => {
      const res = await makeRequest("/api/v1/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${validToken}` },
      });
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
    });
  });
});
