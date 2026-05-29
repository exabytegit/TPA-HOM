import { toyotaPlanConfig } from "../../config/toyotaPlanConfig";
import { AppError } from "../../utils/appError";
import {
  axiosHttpClient,
  getErrorResponseData,
  getErrorStatusCode,
  HttpClient,
  isTimeoutError
} from "../../utils/httpClient";
import { logger, sanitizeForLog } from "../../utils/logger";
import { incrementMetric } from "../../utils/metrics";
import { generateLinkResponseSchema } from "./toyotaPlan.schemas";
import { ToyotaPlanAuthService, toyotaPlanAuthService } from "./toyotaPlanAuth.service";
import {
  GenerateSubscriptionLinkResult,
  RequestMetadata,
  ToyotaPlanCatalogItem,
  ToyotaPlanGenerateLinkRequest,
  ToyotaPlanGenerateLinkResponse,
  ToyotaPlanRuntimeConfig
} from "./toyotaPlan.types";
import {
  ToyotaPlanCatalogService,
  toyotaPlanCatalogService
} from "./toyotaPlanCatalog.service";

export class ToyotaPlanService {
  constructor(
    private readonly catalogService: ToyotaPlanCatalogService = toyotaPlanCatalogService,
    private readonly authService: ToyotaPlanAuthService = toyotaPlanAuthService,
    private readonly httpClient: HttpClient = axiosHttpClient,
    private readonly config: ToyotaPlanRuntimeConfig = toyotaPlanConfig
  ) {}

  async generateSubscriptionLink(
    slug: string,
    metadata: RequestMetadata = {}
  ): Promise<GenerateSubscriptionLinkResult> {
    const startedAt = Date.now();
    incrementMetric("toyota_plan_link_generation_started_total");
    logger.info("toyota_plan.link_generation.started", {
      slug,
      seller: this.config.seller,
      durationMs: 0,
      ip: metadata.ip,
      userAgent: metadata.userAgent
    });

    const catalogItem = this.catalogService.getEnabledCatalogItemBySlug(slug);
    const payload = this.toToyotaPlanPayload(catalogItem);

    logger.info("Toyota Plan catalog item resolved", {
      slug,
      modelId: payload.modelId,
      planId: payload.planId,
      amount: payload.amount,
      seller: payload.seller,
      ip: metadata.ip,
      userAgent: metadata.userAgent
    });

    try {
      const token = await this.authService.getAccessToken();
      const toyotaResponse = await this.callGenerateLink(payload, token, false);

      if (!toyotaResponse.success || !toyotaResponse.link) {
        const upstreamMessage = this.extractUpstreamMessage(toyotaResponse);
        logger.error("Toyota Plan returned unsuccessful response", {
          slug,
          response: toyotaResponse,
          upstreamMessage,
          ip: metadata.ip,
          userAgent: metadata.userAgent
        });
        throw new AppError(422, "Toyota Plan integration error", "TOYOTA_PLAN_LINK_REJECTED", true, {
          slug,
          upstreamMessage
        });
      }

      this.validateReturnedLinkHost(toyotaResponse.link);

      incrementMetric("toyota_plan_link_generation_success_total");
      logger.info("toyota_plan.link_generation.success", {
        slug,
        modelId: payload.modelId,
        planId: payload.planId,
        amount: payload.amount,
        seller: payload.seller,
        durationMs: Date.now() - startedAt,
        statusCode: 200,
        ip: metadata.ip,
        userAgent: metadata.userAgent
      });

      return {
        success: true,
        link: toyotaResponse.link,
        model: catalogItem.modelDescription,
        plan: catalogItem.planDescription,
        amount: catalogItem.amount
      };
    } catch (error) {
      incrementMetric("toyota_plan_link_generation_failed_total");
      logger.error("toyota_plan.link_generation.failed", {
        slug,
        seller: this.config.seller,
        durationMs: Date.now() - startedAt,
        errorCode: error instanceof AppError ? error.code : "INTERNAL_ERROR",
        error: error instanceof Error ? error.message : "Unknown error",
        ip: metadata.ip,
        userAgent: metadata.userAgent
      });

      throw error;
    }
  }

  private toToyotaPlanPayload(item: ToyotaPlanCatalogItem): ToyotaPlanGenerateLinkRequest {
    if (!Number.isFinite(item.amount)) {
      throw new AppError(500, "Toyota Plan catalog misconfigured", "TOYOTA_PLAN_AMOUNT_INVALID");
    }

    return {
      modelId: item.modelId,
      planId: item.planId,
      amount: item.amount,
      seller: this.config.seller
    };
  }

  private async callGenerateLink(
    payload: ToyotaPlanGenerateLinkRequest,
    accessToken: string,
    alreadyRetried: boolean
  ): Promise<ToyotaPlanGenerateLinkResponse> {
    try {
      const response = await this.httpClient.post<
        ToyotaPlanGenerateLinkResponse,
        ToyotaPlanGenerateLinkRequest
      >(this.config.generateLinkUrl, payload, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        timeout: this.config.generateLinkTimeoutMs
      });

      return generateLinkResponseSchema.parse(response);
    } catch (error) {
      const responseData = getErrorResponseData(error);
      const statusCode = getErrorStatusCode(error);
      const upstreamMessage = this.extractUpstreamMessage(responseData);

      if (!alreadyRetried && this.isTokenExpiredResponse(responseData)) {
        logger.warn("toyota_plan.link_generation.failed", {
          seller: this.config.seller,
          durationMs: 0,
          errorCode: "TOYOTA_PLAN_LINK_ERROR",
          reason: "token_expired_retry_once"
        });
        const refreshedToken = await this.authService.refreshAccessToken();
        return this.callGenerateLink(payload, refreshedToken, true);
      }

      if (isTimeoutError(error)) {
        logger.warn("toyota_plan.link_generation.failed", {
          modelId: payload.modelId,
          planId: payload.planId,
          seller: this.config.seller,
          durationMs: 0,
          errorCode: "TOYOTA_PLAN_GENERATE_LINK_TIMEOUT",
          reason: "non_idempotent_operation"
        });

        throw new AppError(
          504,
          "Toyota Plan integration error",
          "TOYOTA_PLAN_GENERATE_LINK_TIMEOUT",
          true,
          {
            slug: this.findSlugByPayload(payload),
            upstreamStatusCode: statusCode,
            upstreamMessage
          }
        );
      }

      if (this.isUpstreamTransientError(statusCode, upstreamMessage)) {
        logger.error("toyota_plan.link_generation.failed", {
          modelId: payload.modelId,
          planId: payload.planId,
          seller: payload.seller,
          durationMs: 0,
          errorCode: "TOYOTA_PLAN_UPSTREAM_ERROR",
          response: sanitizeForLog(responseData),
          statusCode,
          upstreamMessage,
          message: error instanceof Error ? error.message : "Unknown error"
        });

        throw new AppError(
          statusCode === 503 || statusCode === 504 ? statusCode : 502,
          "Toyota Plan integration error",
          "TOYOTA_PLAN_UPSTREAM_ERROR",
          true,
          {
            slug: this.findSlugByPayload(payload),
            upstreamStatusCode: statusCode,
            upstreamMessage
          }
        );
      }

      logger.error("toyota_plan.link_generation.failed", {
        modelId: payload.modelId,
        planId: payload.planId,
        seller: payload.seller,
        durationMs: 0,
        errorCode: "TOYOTA_PLAN_LINK_REJECTED",
        response: sanitizeForLog(responseData),
        statusCode,
        upstreamMessage,
        message: error instanceof Error ? error.message : "Unknown error"
      });

      throw new AppError(422, "Toyota Plan integration error", "TOYOTA_PLAN_LINK_REJECTED", true, {
        slug: this.findSlugByPayload(payload),
        upstreamStatusCode: statusCode,
        upstreamMessage
      });
    }
  }

  private isTokenExpiredResponse(responseData: unknown): boolean {
    if (!responseData || typeof responseData !== "object" || !("message" in responseData)) {
      return false;
    }

    const message = String(responseData.message).toLowerCase();
    return message.includes("token") && message.includes("expired");
  }

  private validateReturnedLinkHost(link: string): void {
    try {
      const parsedUrl = new URL(link);

      if (parsedUrl.protocol !== "https:" || parsedUrl.hostname !== this.config.expectedLinkHost) {
        logger.error("Unexpected Toyota Plan link host", {
          expectedHost: this.config.expectedLinkHost,
          receivedHost: parsedUrl.hostname,
          protocol: parsedUrl.protocol
        });
        throw new AppError(502, "Toyota Plan integration error", "TOYOTA_PLAN_LINK_HOST_INVALID");
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error("Invalid Toyota Plan link URL", {
        expectedHost: this.config.expectedLinkHost
      });
      throw new AppError(502, "Toyota Plan integration error", "TOYOTA_PLAN_LINK_URL_INVALID");
    }
  }

  private extractUpstreamMessage(responseData: unknown): string | undefined {
    if (!responseData || typeof responseData !== "object" || !("message" in responseData)) {
      return undefined;
    }

    return typeof responseData.message === "string" ? responseData.message : undefined;
  }

  private isUpstreamTransientError(
    statusCode: number | undefined,
    upstreamMessage: string | undefined
  ): boolean {
    if (statusCode === 502 || statusCode === 503 || statusCode === 504) {
      return true;
    }

    return upstreamMessage?.toLowerCase() === "internal server error";
  }

  private findSlugByPayload(payload: ToyotaPlanGenerateLinkRequest): string | undefined {
    return this.catalogService
      .getCatalog()
      .find(
        (item) =>
          item.modelId === payload.modelId &&
          item.planId === payload.planId &&
          item.amount === payload.amount &&
          item.seller === payload.seller
      )?.slug;
  }
}

export const toyotaPlanService = new ToyotaPlanService();
