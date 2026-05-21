import { env } from "./env";

export const resolveExpectedLinkHost = (
  environment: "sandbox" | "production",
  sandboxHost: string,
  productionHost: string
): string => (environment === "production" ? productionHost : sandboxHost);

export const toyotaPlanConfig = {
  environment: env.TOYOTA_PLAN_ENV,
  seller: env.TOYOTA_PLAN_SELLER,
  scope: env.TOYOTA_PLAN_SCOPE,
  clientId: env.TOYOTA_PLAN_CLIENT_ID,
  clientSecret: env.TOYOTA_PLAN_CLIENT_SECRET,
  oauthTimeoutMs: env.TOYOTA_PLAN_OAUTH_TIMEOUT_MS,
  generateLinkTimeoutMs: env.TOYOTA_PLAN_GENERATE_LINK_TIMEOUT_MS,
  tokenUrl:
    env.TOYOTA_PLAN_ENV === "production"
      ? env.TOYOTA_PLAN_TOKEN_URL_PRODUCTION
      : env.TOYOTA_PLAN_TOKEN_URL_SANDBOX,
  generateLinkUrl:
    env.TOYOTA_PLAN_ENV === "production"
      ? env.TOYOTA_PLAN_GENERATE_LINK_URL_PRODUCTION
      : env.TOYOTA_PLAN_GENERATE_LINK_URL_SANDBOX,
  expectedLinkHost: resolveExpectedLinkHost(
    env.TOYOTA_PLAN_ENV,
    env.TOYOTA_PLAN_EXPECTED_LINK_HOST_SANDBOX,
    env.TOYOTA_PLAN_EXPECTED_LINK_HOST_PRODUCTION
  )
} as const;
