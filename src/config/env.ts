import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  TOYOTA_PLAN_ENV: z.enum(["sandbox", "production"]).default("sandbox"),
  TOYOTA_PLAN_CLIENT_ID: z.string().optional().default(""),
  TOYOTA_PLAN_CLIENT_SECRET: z.string().optional().default(""),
  TOYOTA_PLAN_SCOPE: z.string().min(1).default("ext-link/write"),
  TOYOTA_PLAN_SELLER: z.literal("HOM").default("HOM"),
  TOYOTA_PLAN_TOKEN_URL_SANDBOX: z.string().url(),
  TOYOTA_PLAN_GENERATE_LINK_URL_SANDBOX: z.string().url(),
  TOYOTA_PLAN_TOKEN_URL_PRODUCTION: z.string().url(),
  TOYOTA_PLAN_GENERATE_LINK_URL_PRODUCTION: z.string().url()
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
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
  TOYOTA_PLAN_TOKEN_URL_PRODUCTION:
    process.env.TOYOTA_PLAN_TOKEN_URL_PRODUCTION ??
    "https://auth.suscripcion.toyotaplan.com.ar/oauth2/token",
  TOYOTA_PLAN_GENERATE_LINK_URL_PRODUCTION:
    process.env.TOYOTA_PLAN_GENERATE_LINK_URL_PRODUCTION ??
    "https://suscripcion.toyotaplan.com.ar/api/public/subscriptions/generatelink"
});

export const assertToyotaCredentials = (): void => {
  if (!env.TOYOTA_PLAN_CLIENT_ID || !env.TOYOTA_PLAN_CLIENT_SECRET) {
    throw new Error("Toyota Plan credentials are required to call the external API");
  }
};
