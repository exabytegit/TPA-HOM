import cors from "cors";
import express from "express";
import helmet from "helmet";
import { corsConfig } from "./config/corsConfig";
import { env } from "./config/env";
import { toyotaPlanConfig } from "./config/toyotaPlanConfig";
import { correlationIdMiddleware } from "./middlewares/correlationId";
import { errorHandler } from "./middlewares/errorHandler";
import { requestLogger } from "./middlewares/requestLogger";
import { toyotaPlanRouter } from "./modules/toyotaPlan/toyotaPlan.routes";
import { renderMetrics } from "./utils/metrics";

export const createApp = (options?: { enableMetrics?: boolean; serveStatic?: boolean }) => {
  const app = express();
  const enableMetrics = options?.enableMetrics ?? env.ENABLE_METRICS;
  const shouldServeStatic = options?.serveStatic ?? env.NODE_ENV !== "production";

  app.set("trust proxy", env.TRUST_PROXY);
  app.use(helmet());
  app.use(cors(corsConfig));
  app.use(correlationIdMiddleware);
  app.use(express.json({ limit: "32kb" }));
  app.use(requestLogger);

  if (shouldServeStatic) {
    app.use(express.static("public"));
  }

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "toyota-plan-adapter",
      environment: toyotaPlanConfig.environment,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      nodeEnv: env.NODE_ENV
    });
  });

  if (enableMetrics) {
    app.get("/metrics", (_req, res) => {
      res.type("text/plain").send(`${renderMetrics()}\n`);
    });
  }

  app.use("/api/toyota-plan", toyotaPlanRouter);

  app.use(errorHandler);

  return app;
};
