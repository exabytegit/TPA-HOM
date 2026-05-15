import express from "express";
import helmet from "helmet";
import { errorHandler } from "./middlewares/errorHandler";
import { requestLogger } from "./middlewares/requestLogger";
import { toyotaPlanRouter } from "./modules/toyotaPlan/toyotaPlan.routes";

export const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(express.json({ limit: "32kb" }));
  app.use(requestLogger);

  app.get("/health", (_req, res) => {
    res.json({ success: true, status: "ok" });
  });

  app.use("/api/toyota-plan", toyotaPlanRouter);

  app.use(errorHandler);

  return app;
};
