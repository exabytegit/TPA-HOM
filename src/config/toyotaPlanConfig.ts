import { env } from "./env";

export const toyotaPlanConfig = {
  environment: env.TOYOTA_PLAN_ENV,
  seller: env.TOYOTA_PLAN_SELLER,
  scope: env.TOYOTA_PLAN_SCOPE,
  clientId: env.TOYOTA_PLAN_CLIENT_ID,
  clientSecret: env.TOYOTA_PLAN_CLIENT_SECRET,
  tokenUrl:
    env.TOYOTA_PLAN_ENV === "production"
      ? env.TOYOTA_PLAN_TOKEN_URL_PRODUCTION
      : env.TOYOTA_PLAN_TOKEN_URL_SANDBOX,
  generateLinkUrl:
    env.TOYOTA_PLAN_ENV === "production"
      ? env.TOYOTA_PLAN_GENERATE_LINK_URL_PRODUCTION
      : env.TOYOTA_PLAN_GENERATE_LINK_URL_SANDBOX,
  expectedLinkHost:
    env.TOYOTA_PLAN_ENV === "production"
      ? env.TOYOTA_PLAN_EXPECTED_LINK_HOST_PRODUCTION
      : env.TOYOTA_PLAN_EXPECTED_LINK_HOST_SANDBOX
} as const;
