import cors from "cors";
import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { createCorsConfig } from "../src/config/corsConfig";
import { errorHandler } from "../src/middlewares/errorHandler";

describe("app security middleware", () => {
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

    expect(response.body).toEqual({
      success: false,
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
});
