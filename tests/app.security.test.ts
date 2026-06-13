import cors from "cors";
import express from "express";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
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
    vi.unstubAllGlobals();
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
    expect(response.text).toContain("Actualizar precios");
    expect(response.text).toContain('id="update-prices-button"');
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
    expect(response.text).toContain('fetch("/api/dev/catalog-sheet"');
    expect(response.text).toContain('updatePricesFromSheet');
    expect(response.text).toContain('addEventListener("click", runAllSequentially)');
    expect(response.headers["content-type"]).toContain("javascript");
  });

  it("does not serve test-modelos.js when static files are disabled", async () => {
    await request(createApp({ serveStatic: false })).get("/test-modelos.js").expect(404);
  });

  it("serves development catalog sheet data when enabled", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        text: async () =>
          [
            "ID MOD,DESC MODELO,ID PLAN,DESC PLAN,AMOUNT",
            '114,"HILUX 4X4 D/C DX 2.4 TDI 6 A/T",113,"PLAN 100% DIF G 84M","$ 558.824,14"'
          ].join("\n")
      }))
    );

    const response = await request(createApp({ serveDevCatalog: true }))
      .get("/api/dev/catalog-sheet")
      .set("Origin", "http://localhost:5173")
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0]).toMatchObject({
      modelId: expect.any(String),
      modelDescription: expect.any(String),
      planId: expect.any(String),
      planDescription: expect.any(String),
      amount: expect.any(Number)
    });
  });

  it("does not serve development catalog sheet data when disabled", async () => {
    vi.stubGlobal("fetch", vi.fn());

    await request(createApp({ serveDevCatalog: false }))
      .get("/api/dev/catalog-sheet")
      .set("Origin", "http://localhost:5173")
      .expect(404);
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

  it("serves TPA.html when static files are enabled", async () => {
    const response = await request(createApp({ serveStatic: true })).get("/TPA.html").expect(200);

    expect(response.text).toContain("Planes de Ahorro Toyota");
    expect(response.text).toContain("Elegi tu Toyota y comenzá tu suscripción online");
    expect(response.text).toContain("Atención personalizada");
    expect(response.text).toContain("Proceso simple");
    expect(response.text).toContain("Concesionario Toyota");
    expect(response.text).toContain("Una experiencia clara para avanzar con confianza");
    expect(response.text).toContain("Como funciona");
    expect(response.text).toContain("Preguntas frecuentes");
    expect(response.text).toContain('<link rel="stylesheet" href="/TPA.css" />');
    expect(response.text).toContain('<script src="/TPA.js" defer></script>');
    expect(response.text).not.toContain("correlationId");
    expect(response.text).not.toContain("modelId");
    expect(response.text).not.toContain("planId");
    expect(response.text).not.toContain("seller");
    expect(response.text).not.toContain("linkHost");
    expect(response.text).not.toContain("upstreamMessage");
    expect(response.text).not.toContain("<script>");
    expect(response.text).not.toContain("style=");
    expect(response.text).not.toContain("onclick=");
    expect(response.text).not.toContain("onload=");
    expect(response.text).not.toContain("onchange=");
  });

  it("does not serve TPA.html when static files are disabled", async () => {
    await request(createApp({ serveStatic: false })).get("/TPA.html").expect(404);
  });

  it("redirects root and lowercase aliases to TPA.html in development", async () => {
    await request(createApp({ serveStatic: true })).get("/").redirects(0).expect(302).expect("Location", "/TPA.html");
    await request(createApp({ serveStatic: true })).get("/tpa").redirects(0).expect(302).expect("Location", "/TPA.html");
    await request(createApp({ serveStatic: true }))
      .get("/tpa.html")
      .redirects(0)
      .expect(302)
      .expect("Location", "/TPA.html");
  });

  it("serves admin.html when static files are enabled", async () => {
    const response = await request(createApp({ serveStatic: true })).get("/admin.html").expect(200);

    expect(response.text).toContain("Administracion TPA-HOM");
    expect(response.text).toContain("Validacion de catalogo, pruebas sandbox y diagnostico tecnico");
    expect(response.text).toContain("Catálogo Toyota Plan");
    expect(response.text).toContain("Estado del catálogo");
    expect(response.text).toContain("Herramientas disponibles");
    expect(response.text).toContain("Fuente de datos");
    expect(response.text).toContain("Roadmap");
    expect(response.text).toContain("Actualizar precios desde Sheet");
    expect(response.text).toContain("Información técnica");
    expect(response.text).toContain("Google Sheet público configurado");
    expect(response.text).toContain("Función disponible por línea de comandos.");
    expect(response.text).toContain('<link rel="stylesheet" href="/admin.css" />');
    expect(response.text).toContain('<script src="/admin.js" defer></script>');
    expect(response.text).not.toContain("<style");
    expect(response.text).not.toContain("style=");
    expect(response.text).not.toContain("<script>");
    expect(response.text).not.toContain("onclick=");
    expect(response.text).not.toContain("onload=");
    expect(response.text).not.toContain("onchange=");
  });

  it("does not serve admin.html when static files are disabled", async () => {
    await request(createApp({ serveStatic: false })).get("/admin.html").expect(404);
  });

  it("redirects /admin to admin.html in development", async () => {
    await request(createApp({ serveStatic: true }))
      .get("/admin")
      .redirects(0)
      .expect(302)
      .expect("Location", "/admin.html");
  });

  it("serves TPA.css when static files are enabled", async () => {
    const response = await request(createApp({ serveStatic: true })).get("/TPA.css").expect(200);

    expect(response.text).toContain(".plan-card");
    expect(response.text).toContain(".vehicle-image");
    expect(response.text).toContain(".details-panel");
    expect(response.text).toContain(".status-pill");
    expect(response.text).toContain(".trust-badge");
    expect(response.text).toContain(".benefit-card");
    expect(response.text).toContain(".step-card");
    expect(response.text).toContain(".faq-item");
    expect(response.headers["content-type"]).toContain("text/css");
  });

  it("serves TPA.js when static files are enabled", async () => {
    const response = await request(createApp({ serveStatic: true })).get("/TPA.js").expect(200);

    expect(response.text).toContain('fetch("/api/dev/catalog"');
    expect(response.text).toContain('fetch("/api/toyota-plan/generate-link"');
    expect(response.text).toContain('window.open(body.link, "_blank", "noopener,noreferrer")');
    expect(response.text).toContain("vehicleImagesByModelPlan");
    expect(response.text).toContain("Iniciar suscripcion online");
    expect(response.text).toContain("Hablar con un asesor");
    expect(response.text).toContain("Ver detalles del plan");
    expect(response.text).toContain("Preparando tu suscripcion...");
    expect(response.text).toContain("Suscripcion lista. Abrimos el siguiente paso en una nueva pestaña.");
    expect(response.text).not.toContain("Abrir link sandbox");
    expect(response.text).not.toContain("correlationId");
    expect(response.text).not.toContain("linkHost");
    expect(response.text).not.toContain("upstreamMessage");
    expect(response.text).not.toContain("client_secret");
    expect(response.text).not.toContain("access_token");
    expect(response.text).not.toContain("client_id");
    expect(response.text).not.toContain("Authorization: Bearer");
    expect(response.text).not.toContain("onclick=");
    expect(response.text).not.toContain("onload=");
    expect(response.text).not.toContain("onchange=");
    expect(response.headers["content-type"]).toContain("javascript");
  });

  it("does not serve TPA.js when static files are disabled", async () => {
    await request(createApp({ serveStatic: false })).get("/TPA.js").expect(404);
  });

  it("serves admin.css when static files are enabled", async () => {
    const response = await request(createApp({ serveStatic: true })).get("/admin.css").expect(200);

    expect(response.text).toContain(".login-card");
    expect(response.text).toContain(".admin-header");
    expect(response.text).toContain(".catalog-dashboard");
    expect(response.text).toContain(".dashboard-card");
    expect(response.text).toContain(".technical-accordion");
    expect(response.text).toContain(".status-pill");
    expect(response.text).toContain(".update-panel");
    expect(response.text).toContain(".update-summary-grid");
    expect(response.text).toContain(".btn-accent");
    expect(response.headers["content-type"]).toContain("text/css");
  });

  it("serves admin.js when static files are enabled", async () => {
    const response = await request(createApp({ serveStatic: true })).get("/admin.js").expect(200);

    expect(response.text).toContain('sessionStorage.getItem(AUTH_STORAGE_KEY)');
    expect(response.text).toContain('fetch("/api/dev/admin/login"');
    expect(response.text).toContain('fetch("/api/dev/catalog"');
    expect(response.text).toContain('fetch("/api/toyota-plan/generate-link"');
    expect(response.text).toContain('fetch("/api/dev/admin/catalog/update-amounts-from-sheet"');
    expect(response.text).toContain('"x-admin-session": token');
    expect(response.text).toContain("Credenciales invalidas");
    expect(response.text).toContain("tpa_admin_authenticated");
    expect(response.text).toContain("tpa_admin_session_token");
    expect(response.text).not.toContain("/api/dev/catalog-sheet");
    expect(response.text).not.toContain("homfsa3600");
    expect(response.text).not.toContain("client_secret");
    expect(response.text).not.toContain("access_token");
    expect(response.text).not.toContain("client_id");
    expect(response.text).not.toContain("Authorization: Bearer");
    expect(response.text).not.toContain("onclick=");
    expect(response.text).not.toContain("onload=");
    expect(response.text).not.toContain("onchange=");
    expect(response.headers["content-type"]).toContain("javascript");
  });

  it("does not serve admin.js when static files are disabled", async () => {
    await request(createApp({ serveStatic: false })).get("/admin.js").expect(404);
  });

  it("keeps public html js and css assets free of absolute local URLs", async () => {
    const publicDir = join(process.cwd(), "public");
    const files = (await readdir(publicDir)).filter((file) => /\.(html|js|css)$/i.test(file));
    const forbiddenPatterns = [
      /https:\/\/192\.168\.25\.95/gi,
      /http:\/\/192\.168\.25\.95/gi,
      /https:\/\/localhost/gi,
      /http:\/\/localhost/gi,
      /https:\/\/127\.0\.0\.1/gi,
      /http:\/\/127\.0\.0\.1/gi
    ];

    for (const file of files) {
      const content = await readFile(join(publicDir, file), "utf8");
      for (const pattern of forbiddenPatterns) {
        expect(content).not.toMatch(pattern);
      }
    }
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

  it("authenticates admin login with dev credentials", async () => {
    const response = await request(createApp({ serveDevCatalog: true }))
      .post("/api/dev/admin/login")
      .send({
        username: env.ADMIN_USERNAME,
        password: env.ADMIN_PASSWORD
      })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      adminSessionToken: expect.any(String)
    });
  });

  it("rejects invalid admin login credentials", async () => {
    const response = await request(createApp({ serveDevCatalog: true }))
      .post("/api/dev/admin/login")
      .send({
        username: env.ADMIN_USERNAME,
        password: "wrong-password"
      })
      .expect(401);

    expect(response.body).toEqual({
      success: false,
      message: "Credenciales invalidas"
    });
  });

  it("does not expose admin login when dev endpoints are disabled", async () => {
    await request(createApp({ serveDevCatalog: false }))
      .post("/api/dev/admin/login")
      .send({
        username: env.ADMIN_USERNAME,
        password: env.ADMIN_PASSWORD
      })
      .expect(404);
  });

  it("does not expose admin login in production", async () => {
    env.NODE_ENV = "production";
    await request(createApp())
      .post("/api/dev/admin/login")
      .send({
        username: env.ADMIN_USERNAME,
        password: env.ADMIN_PASSWORD
      })
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
