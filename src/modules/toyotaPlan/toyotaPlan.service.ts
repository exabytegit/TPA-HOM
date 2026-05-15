import { toyotaPlanConfig } from "../../config/toyotaPlanConfig";
import { AppError } from "../../utils/appError";
import { axiosHttpClient, getErrorResponseData, HttpClient } from "../../utils/httpClient";
import { logger } from "../../utils/logger";
import { generateLinkResponseSchema } from "./toyotaPlan.schemas";
import { ToyotaPlanAuthService, toyotaPlanAuthService } from "./toyotaPlanAuth.service";
import {
  GenerateSubscriptionLinkResult,
  ToyotaPlanCatalogItem,
  ToyotaPlanGenerateLinkRequest,
  ToyotaPlanGenerateLinkResponse,
  ToyotaPlanRuntimeConfig
} from "./toyotaPlan.types";
import {
  ToyotaPlanCatalogService,
  toyotaPlanCatalogService
} from "./toyotaPlanCatalog.service";

const HTTP_TIMEOUT_MS = 15000;

export class ToyotaPlanService {
  constructor(
    private readonly catalogService: ToyotaPlanCatalogService = toyotaPlanCatalogService,
    private readonly authService: ToyotaPlanAuthService = toyotaPlanAuthService,
    private readonly httpClient: HttpClient = axiosHttpClient,
    private readonly config: ToyotaPlanRuntimeConfig = toyotaPlanConfig
  ) {}

  async generateSubscriptionLink(slug: string): Promise<GenerateSubscriptionLinkResult> {
    logger.info("Toyota Plan generate link requested", { slug });

    const catalogItem = this.catalogService.getEnabledCatalogItemBySlug(slug);
    const payload = this.toToyotaPlanPayload(catalogItem);

    logger.info("Toyota Plan catalog item resolved", {
      slug,
      modelId: payload.modelId,
      planId: payload.planId,
      amount: payload.amount,
      seller: payload.seller
    });

    const token = await this.authService.getAccessToken();
    const toyotaResponse = await this.callGenerateLink(payload, token, false);

    if (!toyotaResponse.success || !toyotaResponse.link) {
      logger.error("Toyota Plan returned unsuccessful response", {
        slug,
        response: toyotaResponse
      });
      throw new AppError(502, "Toyota Plan integration error", "TOYOTA_PLAN_LINK_FAILED");
    }

    logger.info("Toyota Plan link generated", {
      slug,
      modelId: payload.modelId,
      planId: payload.planId
    });

    return {
      success: true,
      link: toyotaResponse.link,
      model: catalogItem.modelDescription,
      plan: catalogItem.planDescription,
      amount: catalogItem.amount
    };
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
        timeout: HTTP_TIMEOUT_MS
      });

      return generateLinkResponseSchema.parse(response);
    } catch (error) {
      const responseData = getErrorResponseData(error);

      if (!alreadyRetried && this.isTokenExpiredResponse(responseData)) {
        logger.warn("Toyota Plan token expired, refreshing once");
        const refreshedToken = await this.authService.refreshAccessToken();
        return this.callGenerateLink(payload, refreshedToken, true);
      }

      logger.error("Toyota Plan generate link error", {
        response: responseData
      });

      throw new AppError(502, "Toyota Plan integration error", "TOYOTA_PLAN_LINK_ERROR");
    }
  }

  private isTokenExpiredResponse(responseData: unknown): boolean {
    if (!responseData || typeof responseData !== "object" || !("message" in responseData)) {
      return false;
    }

    const message = String(responseData.message).toLowerCase();
    return message.includes("token") && message.includes("expired");
  }
}

export const toyotaPlanService = new ToyotaPlanService();
