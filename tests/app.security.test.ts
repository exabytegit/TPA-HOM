import cors from "cors";
import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { env } from "../src/config/env";
import { createCorsConfig } from "../src/config/corsConfig";
import { correlationIdMiddleware } from "../src/middlewares/correlationId";
import { errorHandler } from "../src/middlewares/errorHandler";
import { AppError } from "../src/utils/appError";

describe("app security middleware", () => {
  const originalNodeEnv = env.NODE_ENV;

  afterEach(() => {
    env.NODE_ENV = originalNodeEnv;
  });

  it("returns healthcheck data without external calls", async () => {
    const response = await request(createApp())
      .get("/health")
      .set("Origin", "http://localhost:5173")
      .expect(200);

    expect(response.body).toMatchObject({
      status: "ok",
      service: "toyota-plan-adapter",
      environment: "sandbox"
    });
    expect(response.body.timestamp).toEqual(expect.any(String));
    expect(response.body.uptime).toEqual(expect.any(Number));
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("allows configured CORS origins", async () => {
    const response = await request(createApp())
      .get("/health")
      .set("Origin", "http://localhost:5173")
      .expect(200);

    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
  });

  it("rejects unconfigured CORS origins", async () => {
    const response = await request(createApp())
      .get("/health")
      .set("Origin", "https://not-authorized.example.com")
      .expect(403);

    expect(response.body).toMatchObject({
      success: false,
      code: "CORS_ORIGIN_NOT_ALLOWED",
      message: "Not allowed by CORS"
    });
  });

  it("rejects requests without Origin in production CORS config", async () => {
    const app = express();
    app.use(
      cors(
        createCorsConfig({
          nodeEnv: "production",
          allowedOrigins: ["https://www.homu.com.ar"]
        })
      )
    );
    app.get("/health", (_req, res) => res.json({ status: "ok" }));
    app.use(errorHandler);

    await request(app).get("/health").expect(403);
  });

  it("rate limits generate-link requests", async () => {
    const app = createApp();

    for (let index = 0; index < 10; index += 1) {
      await request(app)
        .post("/api/toyota-plan/generate-link")
        .set("Origin", "http://localhost:5173")
        .send({})
        .expect(400);
    }

    const response = await request(app)
      .post("/api/toyota-plan/generate-link")
      .set("Origin", "http://localhost:5173")
      .send({})
      .expect(429);

    expect(response.body).toEqual({
      success: false,
      message: "Too many requests. Please try again later."
    });
  });

  it("does not rate limit healthcheck after generate-link limit is exhausted", async () => {
    const app = createApp();

    for (let index = 0; index < 11; index += 1) {
      await request(app)
        .post("/api/toyota-plan/generate-link")
        .set("Origin", "http://localhost:5173")
        .send({});
    }

    await request(app).get("/health").set("Origin", "http://localhost:5173").expect(200);
  });

  it("does not expose /metrics by default", async () => {
    await request(createApp()).get("/metrics").expect(404);
  });

  it("exposes /metrics when explicitly enabled", async () => {
    const response = await request(createApp({ enableMetrics: true })).get("/metrics").expect(200);

    expect(response.text).toContain("toyota_plan_link_generation_started_total");
    expect(response.headers["content-type"]).toContain("text/plain");
  });

  it("serves test-modelos.html when static files are enabled", async () => {
    const response = await request(createApp({ serveStatic: true })).get("/test-modelos.html").expect(200);

    expect(response.text).toContain("TPA-HOM - Test interno de modelos");
    expect(response.text).toContain('<script src="/test-modelos.js" defer></script>');
    expect(response.text).not.toContain("<script>");
    expect(response.text).not.toContain("onclick=");
    expect(response.text).not.toContain("onload=");
    expect(response.text).not.toContain("onchange=");
  });

  it("does not serve test-modelos.html when static files are disabled", async () => {
    await request(createApp({ serveStatic: false })).get("/test-modelos.html").expect(404);
  });

  it("serves test-modelos.js when static files are enabled", async () => {
    const response = await request(createApp({ serveStatic: true })).get("/test-modelos.js").expect(200);

    expect(response.text).toContain('fetch("/api/dev/catalog"');
    expect(response.text).toContain('addEventListener("click", runAllSequentially)');
    expect(response.headers["content-type"]).toContain("javascript");
  });

  it("does not serve test-modelos.js when static files are disabled", async () => {
    await request(createApp({ serveStatic: false })).get("/test-modelos.js").expect(404);
  });

  it("serves test-planes.html when static files are enabled", async () => {
    const response = await request(createApp({ serveStatic: true })).get("/test-planes.html").expect(200);

    expect(response.text).toContain("Planes de Ahorro");
    expect(response.text).toContain("Toyota Plan: Pensado para vos");
    expect(response.text).toContain('<link rel="stylesheet" href="/test-planes.css"');
    expect(response.text).toContain('<script src="/test-planes.js" defer></script>');
    expect(response.text).not.toContain('class="toolbar"');
    expect(response.text).not.toContain('id="catalog-banner"');
    expect(response.text).not.toContain('class="banner"');
    expect(response.text).not.toContain('class="summary"');
    expect(response.text).not.toContain("Error Toyota transitorio");
    expect(response.text).not.toContain("Error backend/red");
    expect(response.text).not.toContain("<style");
    expect(response.text).not.toContain("<script>");
    expect(response.text).not.toContain("style=");
    expect(response.text).not.toContain("onclick=");
    expect(response.text).not.toContain("onload=");
    expect(response.text).not.toContain("onchange=");
  });

  it("does not serve test-planes.html when static files are disabled", async () => {
    await request(createApp({ serveStatic: false })).get("/test-planes.html").expect(404);
  });

  it("serves test-planes.css when static files are enabled", async () => {
    const response = await request(createApp({ serveStatic: true })).get("/test-planes.css").expect(200);

    expect(response.text).toContain(".page-header");
    expect(response.text).toContain(".cards-grid");
    expect(response.text).toContain(".vehicle-media");
    expect(response.text).toContain(".vehicle-image");
    expect(response.text).toContain(".sandbox-tools");
    expect(response.text).toContain(".diagnostic-details");
    expect(response.headers["content-type"]).toContain("text/css");
  });

  it("serves test-planes.js when static files are enabled", async () => {
    const response = await request(createApp({ serveStatic: true })).get("/test-planes.js").expect(200);

    expect(response.text).toContain('fetch("/api/dev/catalog"');
    expect(response.text).toContain('JSON.stringify({ slug })');
    expect(response.text).toContain('addEventListener("click", runAllSequentially)');
    expect(response.text).toContain("vehicleImagesByModelPlan");
    expect(response.text).toContain('document.createElement("details")');
    expect(response.text).toContain('document.createElement("summary")');
    expect(response.text).toContain("Ver diagnostico tecnico");
    expect(response.text).toContain("Ver mas detalles");
    expect(response.text).toContain("Solicitar un Asesor");
    expect(response.text).toContain("Suscripcion Online");
    expect(response.text).toContain("Abrir link sandbox");
    expect(response.text).toContain("/Images/114-HILUX_4X4_DX_AT-113-PLAN_100_DIF_G_84M.jpg");
    expect(response.text).not.toContain("https://www.lineup.com.ar");
    expect(response.text).not.toContain("cbredes.s3");
    expect(response.text).not.toContain("client_secret");
    expect(response.text).not.toContain("access_token");
    expect(response.text).not.toContain("Authorization: Bearer");
    expect(response.headers["content-type"]).toContain("javascript");
  });

  it("does not serve test-planes.js when static files are disabled", async () => {
    await request(createApp({ serveStatic: false })).get("/test-planes.js").expect(404);
  });

  it("serves local vehicle images when static files are enabled", async () => {
    const response = await request(createApp({ serveStatic: true }))
      .get("/Images/114-HILUX_4X4_DX_AT-113-PLAN_100_DIF_G_84M.jpg")
      .expect(200);

    expect(response.headers["content-type"]).toContain("image/jpeg");
  });

  it("serves development catalog when enabled", async () => {
    const response = await request(createApp({ serveDevCatalog: true }))
      .get("/api/dev/catalog")
      .set("Origin", "http://localhost:5173")
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0]).toMatchObject({
      slug: expect.any(String),
      modelDescription: expect.any(String),
      planDescription: expect.any(String),
      amount: expect.any(Number),
      seller: "HOM",
      enabled: expect.any(Boolean),
      modelId: expect.any(String),
      planId: expect.any(String)
    });
    expect(response.body[0]).not.toHaveProperty("link");
    expect(response.body[0]).not.toHaveProperty("clientSecret");
    expect(response.body[0]).not.toHaveProperty("access_token");
  });

  it("does not serve development catalog when disabled", async () => {
    await request(createApp({ serveDevCatalog: false }))
      .get("/api/dev/catalog")
      .set("Origin", "http://localhost:5173")
      .expect(404);
  });

  it("returns sanitized dev error details for operational Toyota errors", async () => {
    env.NODE_ENV = "development";
    const app = express();
    app.use(correlationIdMiddleware);
    app.get("/boom", (_req, _res, next) => {
      next(
        new AppError(422, "Toyota Plan integration error", "TOYOTA_PLAN_LINK_REJECTED", true, {
          slug: "slug-demo",
          upstreamStatusCode: 200,
          upstreamMessage:
            "El valor de cuota 1 declarado para el modelo y plan no puede ser superior al valor de lista de TPA"
        })
      );
    });
    app.use(errorHandler);

    const response = await request(app)
      .get("/boom")
      .set("x-correlation-id", "corr-dev-error")
      .expect(422);

    expect(response.body).toMatchObject({
      success: false,
      message: "Toyota Plan integration error",
      code: "TOYOTA_PLAN_LINK_REJECTED",
      correlationId: "corr-dev-error",
      details: {
        slug: "slug-demo",
        upstreamStatusCode: 200,
        upstreamMessage:
          "El valor de cuota 1 declarado para el modelo y plan no puede ser superior al valor de lista de TPA"
      }
    });
  });

  it("does not expose upstreamMessage details in production error responses", async () => {
    env.NODE_ENV = "production";
    const app = express();
    app.use(correlationIdMiddleware);
    app.get("/boom", (_req, _res, next) => {
      next(
        new AppError(502, "Toyota Plan integration error", "TOYOTA_PLAN_UPSTREAM_ERROR", true, {
          slug: "slug-demo",
          upstreamStatusCode: 502,
          upstreamMessage: "Internal server error"
        })
      );
    });
    app.use(errorHandler);

    const response = await request(app)
      .get("/boom")
      .set("x-correlation-id", "corr-prod-error")
      .expect(502);

    expect(response.body).toMatchObject({
      success: false,
      message: "Toyota Plan integration error",
      code: "TOYOTA_PLAN_UPSTREAM_ERROR",
      correlationId: "corr-prod-error"
    });
    expect(response.body).not.toHaveProperty("details");
  });
});
