import request from "supertest";
import app from "../server.js";

describe("Project Helix REST API Version 1", () => {
  it("should return health status data", async () => {
    const res = await request(app)
      .get("/api/v1/health")
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe("OK");
    expect(res.body).toHaveProperty("database");
    expect(res.body).toHaveProperty("uptime");
  });

  it("should return version info", async () => {
    const res = await request(app)
      .get("/api/v1/version")
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.version).toBe("1.0.0");
  });
});
