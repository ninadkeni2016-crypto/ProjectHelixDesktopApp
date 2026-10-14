import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// pluginLoader.js lives in backend/plugins/ — so plugins are subdirs of __dirname itself
const pluginsDir = __dirname;

export const initPlugins = async (app) => {
  logger.info("Plugin System: Scanning for active plugins...");

  if (!fs.existsSync(pluginsDir)) {
    fs.mkdirSync(pluginsDir, { recursive: true });
    logger.info(`Plugin System: Created plugins folder at ${pluginsDir}`);
    return;
  }

  try {
    const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const pluginPath = path.join(pluginsDir, entry.name, "index.js");
        if (fs.existsSync(pluginPath)) {
          logger.info(`Plugin System: Loading plugin "${entry.name}"...`);
          const moduleUrl = `file://${pluginPath.replace(/\\/g, "/")}`;
          const plugin = await import(moduleUrl);
          
          if (plugin && typeof plugin.init === "function") {
            plugin.init(app);
            logger.info(`Plugin System: Plugin "${entry.name}" successfully initialized.`);
          } else {
            logger.warn(`Plugin System: Plugin "${entry.name}" index.js is missing an init() function.`);
          }
        }
      }
    }
  } catch (err) {
    logger.error(`Plugin System: Error loading plugins: ${err.message}`);
  }
};
