import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

export type NodeEnv = "development" | "test" | "production";
export type TrustProxyValue = boolean | number;
export type BooleanFlagValue = boolean;

export const parseTrustProxy = (rawValue: string | undefined): TrustProxyValue => {
  const value = (rawValue ?? "false").trim().toLowerCase();

  if (value === "false" || value === "0" || value === "") {
    return false;
  }

  if (value === "true") {
    return true;
  }

  const numericValue = Number(value);
  if (Number.isInteger(numericValue) && numericValue > 0) {
    return numericValue;
  }

  throw new Error("TRUST_PROXY must be false, true, 0, or a positive integer");
};

export const parseBooleanFlag = (rawValue: string | undefined, defaultValue = false): boolean => {
  const value = (rawValue ?? String(defaultValue)).trim().toLowerCase();

  if (value === "true" || value === "1") {
    return true;
  }

  if (value === "false" || value === "0" || value === "") {
    return false;
  }

  throw new Error("Boolean flag must be true, false, 1, or 0");
};

export const parseCspUpgradeInsecureRequests = (
  rawValue: string | undefined,
  nodeEnv: NodeEnv
): boolean => parseBooleanFlag(rawValue, nodeEnv === "production");

export const parseCorsAllowedOrigins = (rawValue: string | undefined, nodeEnv: NodeEnv): string[] => {
  const value =
    rawValue ?? (nodeEnv === "production" ? "" : "http://localhost:5173,http://localhost:3000");
  const origins = value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.includes("*")) {
    throw new Error("CORS_ALLOWED_ORIGINS does not allow wildcard origins");
  }

  if (nodeEnv === "production" && origins.length === 0) {
    throw new Error("CORS_ALLOWED_ORIGINS must contain at least one origin in production");
  }

  return origins.map((origin) => {
    let parsedUrl: URL;

    try {
      parsedUrl = new URL(origin);
    } catch {
      throw new Error(`Invalid CORS origin: ${origin}`);
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error(`Invalid CORS origin protocol: ${origin}`);
    }

    if (parsedUrl.origin !== origin || parsedUrl.pathname !== "/" || parsedUrl.search || parsedUrl.hash) {
      throw new Error(`CORS_ALLOWED_ORIGINS must contain origins only: ${origin}`);
    }

    return parsedUrl.origin;
  });
};

const rawEnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3000),
    CORS_ALLOWED_ORIGINS: z.string().optional(),
    TRUST_PROXY: z.string().default("false"),
    ENABLE_METRICS: z.string().default("false"),
    CSP_UPGRADE_INSECURE_REQUESTS: z.string().optional(),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
    RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(10),
    TOYOTA_PLAN_OAUTH_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
    TOYOTA_PLAN_GENERATE_LINK_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
    ADMIN_USERNAME: z.string().min(1).default("homu"),
    ADMIN_PASSWORD: z.string().min(1).default("change_me_local"),
    TOYOTA_PLAN_ENV: z.enum(["sandbox", "production"]).default("sandbox"),
    TOYOTA_PLAN_CLIENT_ID: z.string().optional().default(""),
    TOYOTA_PLAN_CLIENT_SECRET: z.string().optional().default(""),
    TOYOTA_PLAN_SCOPE: z.string().min(1).default("ext-link/write"),
    TOYOTA_PLAN_SELLER: z.literal("HOM").default("HOM"),
    TOYOTA_PLAN_TOKEN_URL_SANDBOX: z.string().url(),
    TOYOTA_PLAN_GENERATE_LINK_URL_SANDBOX: z.string().url(),
    TOYOTA_PLAN_EXPECTED_LINK_HOST_SANDBOX: z.string().min(1),
    TOYOTA_PLAN_TOKEN_URL_PRODUCTION: z.string().url(),
    TOYOTA_PLAN_GENERATE_LINK_URL_PRODUCTION: z.string().url(),
    TOYOTA_PLAN_EXPECTED_LINK_HOST_PRODUCTION: z.string().min(1)
  })
  .superRefine((values, context) => {
    try {
      parseCorsAllowedOrigins(values.CORS_ALLOWED_ORIGINS, values.NODE_ENV);
    } catch (error) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["CORS_ALLOWED_ORIGINS"],
        message: error instanceof Error ? error.message : "Invalid CORS_ALLOWED_ORIGINS"
      });
    }

    try {
      parseTrustProxy(values.TRUST_PROXY);
    } catch (error) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["TRUST_PROXY"],
        message: error instanceof Error ? error.message : "Invalid TRUST_PROXY"
      });
    }

    try {
      parseBooleanFlag(values.ENABLE_METRICS);
    } catch (error) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ENABLE_METRICS"],
        message: error instanceof Error ? error.message : "Invalid ENABLE_METRICS"
      });
    }

    try {
      parseCspUpgradeInsecureRequests(values.CSP_UPGRADE_INSECURE_REQUESTS, values.NODE_ENV);
    } catch (error) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["CSP_UPGRADE_INSECURE_REQUESTS"],
        message:
          error instanceof Error ? error.message : "Invalid CSP_UPGRADE_INSECURE_REQUESTS"
      });
    }
  });

const rawEnv = rawEnvSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  CORS_ALLOWED_ORIGINS: process.env.CORS_ALLOWED_ORIGINS,
  TRUST_PROXY: process.env.TRUST_PROXY,
  ENABLE_METRICS: process.env.ENABLE_METRICS,
  CSP_UPGRADE_INSECURE_REQUESTS: process.env.CSP_UPGRADE_INSECURE_REQUESTS,
  RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS,
  TOYOTA_PLAN_OAUTH_TIMEOUT_MS: process.env.TOYOTA_PLAN_OAUTH_TIMEOUT_MS,
  TOYOTA_PLAN_GENERATE_LINK_TIMEOUT_MS: process.env.TOYOTA_PLAN_GENERATE_LINK_TIMEOUT_MS,
  ADMIN_USERNAME: process.env.ADMIN_USERNAME,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  TOYOTA_PLAN_ENV: process.env.TOYOTA_PLAN_ENV,
  TOYOTA_PLAN_CLIENT_ID: process.env.TOYOTA_PLAN_CLIENT_ID,
  TOYOTA_PLAN_CLIENT_SECRET: process.env.TOYOTA_PLAN_CLIENT_SECRET,
  TOYOTA_PLAN_SCOPE: process.env.TOYOTA_PLAN_SCOPE,
  TOYOTA_PLAN_SELLER: process.env.TOYOTA_PLAN_SELLER,
  TOYOTA_PLAN_TOKEN_URL_SANDBOX:
    process.env.TOYOTA_PLAN_TOKEN_URL_SANDBOX ??
    "https://auth.sdx.suscripcion.toyotaplan.com.ar/oauth2/token",
  TOYOTA_PLAN_GENERATE_LINK_URL_SANDBOX:
    process.env.TOYOTA_PLAN_GENERATE_LINK_URL_SANDBOX ??
    "https://sdx.suscripcion.toyotaplan.com.ar/api/public/subscriptions/generatelink",
  TOYOTA_PLAN_EXPECTED_LINK_HOST_SANDBOX:
    process.env.TOYOTA_PLAN_EXPECTED_LINK_HOST_SANDBOX ??
    "sdx.suscripcion.toyotaplan.com.ar",
  TOYOTA_PLAN_TOKEN_URL_PRODUCTION:
    process.env.TOYOTA_PLAN_TOKEN_URL_PRODUCTION ??
    "https://auth.suscripcion.toyotaplan.com.ar/oauth2/token",
  TOYOTA_PLAN_GENERATE_LINK_URL_PRODUCTION:
    process.env.TOYOTA_PLAN_GENERATE_LINK_URL_PRODUCTION ??
    "https://suscripcion.toyotaplan.com.ar/api/public/subscriptions/generatelink",
  TOYOTA_PLAN_EXPECTED_LINK_HOST_PRODUCTION:
    process.env.TOYOTA_PLAN_EXPECTED_LINK_HOST_PRODUCTION ??
    "suscripcion.toyotaplan.com.ar"
});

export const env = {
  ...rawEnv,
  CORS_ALLOWED_ORIGINS: parseCorsAllowedOrigins(rawEnv.CORS_ALLOWED_ORIGINS, rawEnv.NODE_ENV),
  TRUST_PROXY: parseTrustProxy(rawEnv.TRUST_PROXY),
  ENABLE_METRICS: parseBooleanFlag(rawEnv.ENABLE_METRICS),
  CSP_UPGRADE_INSECURE_REQUESTS: parseCspUpgradeInsecureRequests(
    rawEnv.CSP_UPGRADE_INSECURE_REQUESTS,
    rawEnv.NODE_ENV
  )
};

export const assertToyotaCredentials = (): void => {
  if (!env.TOYOTA_PLAN_CLIENT_ID || !env.TOYOTA_PLAN_CLIENT_SECRET) {
    throw new Error("Toyota Plan credentials are required to call the external API");
  }
};
