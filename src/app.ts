import cors from "cors";
import express from "express";
import helmet from "helmet";
import { corsConfig } from "./config/corsConfig";
import { env } from "./config/env";
import { toyotaPlanConfig } from "./config/toyotaPlanConfig";
import { errorHandler } from "./middlewares/errorHandler";
import { requestLogger } from "./middlewares/requestLogger";
import { toyotaPlanRouter } from "./modules/toyotaPlan/toyotaPlan.routes";

export const createApp = () => {
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(cors(corsConfig));
  app.use(express.json({ limit: "32kb" }));
  app.use(requestLogger);

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

  app.use("/api/toyota-plan", toyotaPlanRouter);

  app.use(errorHandler);

  return app;
};
