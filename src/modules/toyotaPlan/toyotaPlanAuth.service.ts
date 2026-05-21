import { toyotaPlanConfig } from "../../config/toyotaPlanConfig";
import { AppError } from "../../utils/appError";
import {
  getErrorResponseData,
  getErrorStatusCode,
  HttpClient,
  axiosHttpClient,
  isTransientNetworkError
} from "../../utils/httpClient";
import { logger, sanitizeForLog } from "../../utils/logger";
import { incrementMetric } from "../../utils/metrics";
import { tokenResponseSchema } from "./toyotaPlan.schemas";
import { ToyotaPlanRuntimeConfig, ToyotaPlanTokenResponse } from "./toyotaPlan.types";

const TOKEN_REFRESH_WINDOW_MS = 5 * 60 * 1000;
const OAUTH_MAX_ATTEMPTS = 2;
const OAUTH_RETRY_BACKOFF_MS = 200;

interface CachedToken {
  accessToken: string;
  expiresAtMs: number;
}

export class ToyotaPlanAuthService {
  private cachedToken?: CachedToken;
  private tokenRefreshPromise: Promise<string> | null = null;

  constructor(
    private readonly config: ToyotaPlanRuntimeConfig = toyotaPlanConfig,
    private readonly httpClient: HttpClient = axiosHttpClient
  ) {}

  async getAccessToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAtMs) {
      return this.cachedToken.accessToken;
    }

    if (this.tokenRefreshPromise) {
      return this.tokenRefreshPromise;
    }

    this.tokenRefreshPromise = this.refreshAccessToken();

    try {
      return await this.tokenRefreshPromise;
    } finally {
      this.tokenRefreshPromise = null;
    }
  }

  async refreshAccessToken(): Promise<string> {
    this.assertCredentials();
    const startedAt = Date.now();

    const body = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      grant_type: "client_credentials",
      scope: this.config.scope
    });

    for (let attempt = 1; attempt <= OAUTH_MAX_ATTEMPTS; attempt += 1) {
      try {
        incrementMetric("toyota_plan_oauth_refresh_started_total");
        logger.info("toyota_plan.oauth.refresh.started", {
          seller: this.config.seller,
          durationMs: Date.now() - startedAt,
          oauthAttempt: attempt
        });

        const response = await this.httpClient.post<ToyotaPlanTokenResponse, URLSearchParams>(
          this.config.tokenUrl,
          body,
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded"
            },
            timeout: this.config.oauthTimeoutMs
          }
        );

        const tokenResponse = tokenResponseSchema.parse(response);
        this.cachedToken = {
          accessToken: tokenResponse.access_token,
          expiresAtMs: Date.now() + tokenResponse.expires_in * 1000 - TOKEN_REFRESH_WINDOW_MS
        };

        incrementMetric("toyota_plan_oauth_refresh_success_total");
        logger.info("toyota_plan.oauth.refresh.success", {
          seller: this.config.seller,
          durationMs: Date.now() - startedAt,
          statusCode: 200,
          expiresInSeconds: tokenResponse.expires_in,
          tokenType: tokenResponse.token_type
        });

        return tokenResponse.access_token;
      } catch (error) {
        const responseData = getErrorResponseData(error);
        const statusCode = getErrorStatusCode(error);
        const isRetryable = isTransientNetworkError(error) && attempt < OAUTH_MAX_ATTEMPTS;

        incrementMetric("toyota_plan_oauth_refresh_failed_total");
        logger.error("toyota_plan.oauth.refresh.failed", {
          seller: this.config.seller,
          durationMs: Date.now() - startedAt,
          errorCode: "TOYOTA_PLAN_AUTH_ERROR",
          oauthAttempt: attempt,
          statusCode,
          response: sanitizeForLog(responseData),
          message: error instanceof Error ? error.message : "Unknown error"
        });

        if (isRetryable) {
          logger.warn("toyota_plan.oauth.refresh.failed", {
            seller: this.config.seller,
            durationMs: Date.now() - startedAt,
            errorCode: "TOYOTA_PLAN_AUTH_ERROR",
            oauthAttempt: attempt,
            statusCode
          });
          await this.sleep(OAUTH_RETRY_BACKOFF_MS * attempt);
          continue;
        }

        if (attempt === OAUTH_MAX_ATTEMPTS && isTransientNetworkError(error)) {
          logger.error("toyota_plan.oauth.refresh.failed", {
            seller: this.config.seller,
            durationMs: Date.now() - startedAt,
            errorCode: "TOYOTA_PLAN_AUTH_ERROR",
            oauthAttempt: attempt,
            statusCode,
            retryExhausted: true
          });
        }

        throw new AppError(502, "Toyota Plan integration error", "TOYOTA_PLAN_AUTH_ERROR");
      }
    }

    throw new AppError(502, "Toyota Plan integration error", "TOYOTA_PLAN_AUTH_ERROR");
  }

  private assertCredentials(): void {
    if (!this.config.clientId || !this.config.clientSecret) {
      throw new AppError(
        500,
        "Toyota Plan credentials are not configured",
        "TOYOTA_PLAN_CREDENTIALS_MISSING"
      );
    }
  }

  private sleep(delayMs: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

export const toyotaPlanAuthService = new ToyotaPlanAuthService();
