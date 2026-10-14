import { logger } from "../../utils/logger.js";

export const init = (app) => {
  logger.info("GitHub Plugin: Registering routes...");

  app.get("/api/v1/plugins/github/commits", (req, res) => {
    res.json({
      success: true,
      plugin: "github",
      commits: [
        { sha: "8f7d9a1", message: "Refactor backend architecture", date: new Date().toISOString() },
        { sha: "4b2c1d9", message: "Connect WebSockets telemetry", date: new Date(Date.now() - 3600000).toISOString() }
      ]
    });
  });
};
