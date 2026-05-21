import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { correlationIdMiddleware } from "../src/middlewares/correlationId";
import { logger } from "../src/utils/logger";

const buildApp = () => {
  const app = express();
  app.use(correlationIdMiddleware);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/log", (_req, res) => {
    logger.info("correlation test", {
      access_token: "top-secret-token"
    });
    res.status(204).end();
  });

  app.get("/async-log/:marker", async (req, res) => {
    await new Promise((resolve) => setTimeout(resolve, 15));
    logger.info("async correlation test", {
      marker: req.params.marker
    });
    res.json({ marker: req.params.marker });
  });

  return app;
};

describe("correlationIdMiddleware", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("generates a correlation id when the request does not provide one", async () => {
    const response = await request(buildApp()).get("/health").expect(200);

    expect(response.headers["x-correlation-id"]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it("respects an incoming x-correlation-id", async () => {
    const response = await request(buildApp())
      .get("/health")
      .set("x-correlation-id", "test-correlation-id")
      .expect(200);

    expect(response.headers["x-correlation-id"]).toBe("test-correlation-id");
  });

  it("includes correlationId in logger metadata without leaking secrets", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await request(buildApp())
      .get("/log")
      .set("x-correlation-id", "log-correlation-id")
      .expect(204);

    const logLine = consoleSpy.mock.calls
      .map(([line]) => String(line))
      .find((line) => line.includes('"message":"correlation test"'));

    expect(logLine).toBeDefined();

    const parsedLog = JSON.parse(logLine as string);
    expect(parsedLog.meta.correlationId).toBe("log-correlation-id");
    expect(parsedLog.meta.access_token).toBe("[REDACTED]");
  });

  it("keeps correlation ids isolated across concurrent requests", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const app = buildApp();

    await Promise.all([
      request(app).get("/async-log/first").set("x-correlation-id", "corr-first").expect(200),
      request(app).get("/async-log/second").set("x-correlation-id", "corr-second").expect(200)
    ]);

    const parsedLogs = consoleSpy.mock.calls
      .map(([line]) => String(line))
      .filter((line) => line.includes('"message":"async correlation test"'))
      .map((line) => JSON.parse(line));

    expect(parsedLogs).toHaveLength(2);
    expect(parsedLogs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          meta: expect.objectContaining({
            marker: "first",
            correlationId: "corr-first"
          })
        }),
        expect.objectContaining({
          meta: expect.objectContaining({
            marker: "second",
            correlationId: "corr-second"
          })
        })
      ])
    );
  });
});
