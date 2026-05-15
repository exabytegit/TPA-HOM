import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ALLOWED_ORIGINS: z.string().default("http://localhost:5173,http://localhost:3000"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(10),
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
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  CORS_ALLOWED_ORIGINS: process.env.CORS_ALLOWED_ORIGINS,
  RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS,
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

export const assertToyotaCredentials = (): void => {
  if (!env.TOYOTA_PLAN_CLIENT_ID || !env.TOYOTA_PLAN_CLIENT_SECRET) {
    throw new Error("Toyota Plan credentials are required to call the external API");
  }
};
