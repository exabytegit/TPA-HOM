import { describe, expect, it } from "vitest";
import {
  parseCorsAllowedOrigins,
  parseTrustProxy
} from "../src/config/env";
import { resolveExpectedLinkHost } from "../src/config/toyotaPlanConfig";

describe("environment config validation", () => {
  it("parses valid CORS origins", () => {
    expect(
      parseCorsAllowedOrigins("http://localhost:5173, https://www.homu.com.ar", "production")
    ).toEqual(["http://localhost:5173", "https://www.homu.com.ar"]);
  });

  it.each(["homu.com.ar", "ftp://homu.com.ar", "*"])(
    "rejects invalid CORS origin %s",
    (origin) => {
      expect(() => parseCorsAllowedOrigins(origin, "production")).toThrow();
    }
  );

  it("rejects empty CORS origins in production", () => {
    expect(() => parseCorsAllowedOrigins("", "production")).toThrow(
      "CORS_ALLOWED_ORIGINS must contain at least one origin in production"
    );
  });

  it("allows empty CORS origins outside production", () => {
    expect(parseCorsAllowedOrigins("", "development")).toEqual([]);
  });

  it("parses trust proxy safely", () => {
    expect(parseTrustProxy("false")).toBe(false);
    expect(parseTrustProxy("0")).toBe(false);
    expect(parseTrustProxy("true")).toBe(true);
    expect(parseTrustProxy("1")).toBe(1);
  });

  it("rejects invalid trust proxy values", () => {
    expect(() => parseTrustProxy("not-valid")).toThrow();
  });

  it("resolves Toyota Plan expected link host by environment", () => {
    expect(
      resolveExpectedLinkHost(
        "sandbox",
        "sdx.suscripcion.toyotaplan.com.ar",
        "suscripcion.toyotaplan.com.ar"
      )
    ).toBe("sdx.suscripcion.toyotaplan.com.ar");

    expect(
      resolveExpectedLinkHost(
        "production",
        "sdx.suscripcion.toyotaplan.com.ar",
        "suscripcion.toyotaplan.com.ar"
      )
    ).toBe("suscripcion.toyotaplan.com.ar");
  });
});
