import { createApp } from "./app";
import { env } from "./config/env";
import { toyotaPlanConfig } from "./config/toyotaPlanConfig";
import { logger } from "./utils/logger";

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info("Server started", {
    port: env.PORT,
    nodeEnv: env.NODE_ENV,
    toyotaPlanEnvironment: toyotaPlanConfig.environment
  });
});

const shutdown = (signal: "SIGINT" | "SIGTERM"): void => {
  logger.info("Shutdown signal received", { signal });

  server.close((error) => {
    if (error) {
      logger.error("HTTP server closed with error", {
        error: error.message
      });
      process.exit(1);
    }

    logger.info("HTTP server closed");
    process.exit(0);
  });

  setTimeout(() => {
    logger.error("Forced shutdown after timeout", { signal });
    process.exit(1);
  }, 10000).unref();
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
