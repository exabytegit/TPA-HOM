import { toyotaPlanConfig } from "../../config/toyotaPlanConfig";
import { AppError } from "../../utils/appError";
import { getErrorResponseData, HttpClient, axiosHttpClient } from "../../utils/httpClient";
import { logger, sanitizeForLog } from "../../utils/logger";
import { tokenResponseSchema } from "./toyotaPlan.schemas";
import { ToyotaPlanRuntimeConfig, ToyotaPlanTokenResponse } from "./toyotaPlan.types";

const TOKEN_REFRESH_WINDOW_MS = 5 * 60 * 1000;
const HTTP_TIMEOUT_MS = 15000;

interface CachedToken {
  accessToken: string;
  expiresAtMs: number;
}

export class ToyotaPlanAuthService {
  private cachedToken?: CachedToken;

  constructor(
    private readonly config: ToyotaPlanRuntimeConfig = toyotaPlanConfig,
    private readonly httpClient: HttpClient = axiosHttpClient
  ) {}

  async getAccessToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAtMs) {
      return this.cachedToken.accessToken;
    }

    return this.refreshAccessToken();
  }

  async refreshAccessToken(): Promise<string> {
    this.assertCredentials();

    const body = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      grant_type: "client_credentials",
      scope: this.config.scope
    });

    try {
      logger.info("Requesting Toyota Plan OAuth token", {
        toyotaPlanEnvironment: this.config.environment
      });

      const response = await this.httpClient.post<ToyotaPlanTokenResponse, URLSearchParams>(
        this.config.tokenUrl,
        body,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          },
          timeout: HTTP_TIMEOUT_MS
        }
      );

      const tokenResponse = tokenResponseSchema.parse(response);
      this.cachedToken = {
        accessToken: tokenResponse.access_token,
        expiresAtMs: Date.now() + tokenResponse.expires_in * 1000 - TOKEN_REFRESH_WINDOW_MS
      };

      logger.info("Toyota Plan OAuth token cached", {
        expiresInSeconds: tokenResponse.expires_in,
        tokenType: tokenResponse.token_type
      });

      return tokenResponse.access_token;
    } catch (error) {
      const responseData = getErrorResponseData(error);
      logger.error("Toyota Plan OAuth error", {
        response: sanitizeForLog(responseData),
        message: error instanceof Error ? error.message : "Unknown error"
      });

      throw new AppError(502, "Toyota Plan integration error", "TOYOTA_PLAN_AUTH_ERROR");
    }
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
}

export const toyotaPlanAuthService = new ToyotaPlanAuthService();
