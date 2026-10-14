import { logger } from "../../utils/logger.js";

export const init = (app) => {
  logger.info("Weather Plugin: Registering routes...");

  app.get("/api/v1/plugins/weather", (req, res) => {
    res.json({
      success: true,
      plugin: "weather",
      temperature: "22°C",
      condition: "Partly Cloudy",
      location: "San Francisco, CA"
    });
  });
};
