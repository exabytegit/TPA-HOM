import { createApp } from "./app";
import { env } from "./config/env";
import { toyotaPlanConfig } from "./config/toyotaPlanConfig";
import { logger } from "./utils/logger";

const app = createApp();

app.listen(env.PORT, () => {
  logger.info("Server started", {
    port: env.PORT,
    nodeEnv: env.NODE_ENV,
    toyotaPlanEnvironment: toyotaPlanConfig.environment
  });
});
