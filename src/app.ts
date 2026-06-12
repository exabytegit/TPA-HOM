import cors from "cors";
import express from "express";
import helmet from "helmet";
import { z } from "zod";
import { corsConfig } from "./config/corsConfig";
import { env } from "./config/env";
import { toyotaPlanConfig } from "./config/toyotaPlanConfig";
import { correlationIdMiddleware } from "./middlewares/correlationId";
import { errorHandler } from "./middlewares/errorHandler";
import { requestLogger } from "./middlewares/requestLogger";
import { createAdminSession, validateAdminSession } from "./modules/admin/adminSession.service";
import { toyotaPlanCatalogService } from "./modules/toyotaPlan/toyotaPlanCatalog.service";
import { updateCatalogAmountsFromSheet } from "./modules/toyotaPlan/toyotaPlanCatalogUpdate.service";
import { toyotaPlanRouter } from "./modules/toyotaPlan/toyotaPlan.routes";
import { renderMetrics } from "./utils/metrics";
import { fetchToyotaPlanSheetRows } from "./utils/toyotaPlanSheet";
import { logger } from "./utils/logger";

export const createApp = (options?: {
  enableMetrics?: boolean;
  serveStatic?: boolean;
  serveDevCatalog?: boolean;
}) => {
  const app = express();
  const enableMetrics = options?.enableMetrics ?? env.ENABLE_METRICS;
  const shouldServeStatic = options?.serveStatic ?? env.NODE_ENV !== "production";
  const shouldServeDevCatalog = options?.serveDevCatalog ?? env.NODE_ENV !== "production";

  app.set("trust proxy", env.TRUST_PROXY);
  app.use(helmet());
  app.use(cors(corsConfig));
  app.use(correlationIdMiddleware);
  app.use(express.json({ limit: "32kb" }));
  app.use(requestLogger);

  if (shouldServeStatic) {
    app.use(express.static("public"));
  }

  if (shouldServeDevCatalog) {
    app.get("/api/dev/catalog", (_req, res) => {
      res.json(
        toyotaPlanCatalogService.getCatalog().map((item) => ({
          slug: item.slug,
          modelDescription: item.modelDescription,
          planDescription: item.planDescription,
          amount: item.amount,
          seller: item.seller,
          enabled: item.enabled,
          modelId: item.modelId,
          planId: item.planId
        }))
      );
    });

    app.get("/api/dev/catalog-sheet", async (_req, res, next) => {
      try {
        const rows = await fetchToyotaPlanSheetRows();
        res.json(rows);
      } catch (error) {
        next(error);
      }
    });

    const adminLoginSchema = z.object({
      username: z.string().min(1),
      password: z.string().min(1)
    });

    app.post("/api/dev/admin/login", (req, res) => {
      const result = adminLoginSchema.safeParse(req.body);
      if (!result.success) {
        res.status(401).json({
          success: false,
          message: "Credenciales invalidas"
        });
        return;
      }

      const { username, password } = result.data;
      if (username !== env.ADMIN_USERNAME || password !== env.ADMIN_PASSWORD) {
        res.status(401).json({
          success: false,
          message: "Credenciales invalidas"
        });
        return;
      }

      const adminSessionToken = createAdminSession();
      logger.info("Admin login success", {
        username
      });

      res.json({
        success: true,
        adminSessionToken
      });
    });

    app.post("/api/dev/admin/catalog/update-amounts-from-sheet", async (req, res, next) => {
      try {
        const adminSessionToken = req.get("x-admin-session") ?? undefined;

        if (!validateAdminSession(adminSessionToken)) {
          res.status(401).json({
            success: false,
            message: "Sesion admin invalida",
            code: "ADMIN_SESSION_INVALID"
          });
          return;
        }

        logger.info("Admin catalog update requested", {
          route: "/api/dev/admin/catalog/update-amounts-from-sheet"
        });

        const result = await updateCatalogAmountsFromSheet();

        res.json({
          success: true,
          updatedCount: result.updatedCount,
          unchangedCount: result.unchangedCount,
          sheetOnlyCount: result.sheetOnlyCount,
          catalogOnlyCount: result.catalogOnlyCount,
          backupCreated: result.backupCreated,
          reportPath: result.reportPath,
          message: result.message,
          changes: result.changes
        });
      } catch (error) {
        next(error);
      }
    });
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
