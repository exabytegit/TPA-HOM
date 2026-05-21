import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpClient } from "../src/utils/httpClient";
import { ToyotaPlanAuthService } from "../src/modules/toyotaPlan/toyotaPlanAuth.service";
import { ToyotaPlanCatalogService } from "../src/modules/toyotaPlan/toyotaPlanCatalog.service";
import { ToyotaPlanService } from "../src/modules/toyotaPlan/toyotaPlan.service";
import { ToyotaPlanCatalogItem, ToyotaPlanRuntimeConfig } from "../src/modules/toyotaPlan/toyotaPlan.types";
import { resetMetrics } from "../src/utils/metrics";

const config: ToyotaPlanRuntimeConfig = {
  environment: "sandbox",
  seller: "HOM",
  scope: "ext-link/write",
  clientId: "client-id",
  clientSecret: "client-secret",
  oauthTimeoutMs: 15000,
  generateLinkTimeoutMs: 15000,
  tokenUrl: "https://auth.example.com/oauth2/token",
  generateLinkUrl: "https://api.example.com/generatelink",
  expectedLinkHost: "sdx.suscripcion.toyotaplan.com.ar"
};

const catalogItem: ToyotaPlanCatalogItem = {
  slug: "hilux-4x4-dc-dx-24-tdi-at-plan-100",
  modelId: "114",
  modelDescription: "HILUX 4X4 D/C DX 2.4 TDI 6 A/T",
  planId: "113",
  planDescription: "PLAN 100% DIF G 84M",
  amount: 558824.14,
  seller: "HOM",
  enabled: true
};

const createMockHttpClient = (...responses: unknown[]): HttpClient => {
  const post = vi.fn();

  for (const response of responses) {
    if (response instanceof Error) {
      post.mockRejectedValueOnce(response);
    } else {
      post.mockResolvedValueOnce(response);
    }
  }

  return { post };
};

const tokenExpiredError = Object.assign(new Error("expired"), {
  response: {
    data: {
      message: "The incoming token has expired"
    }
  }
});

const timeoutError = Object.assign(new Error("timeout"), {
  code: "ECONNABORTED"
});

describe("ToyotaPlanService", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    resetMetrics();
  });

  it("emits business logs for link generation lifecycle", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const authHttpClient = createMockHttpClient({
      access_token: "token-1",
      expires_in: 3600,
      token_type: "Bearer"
    });
    const generateHttpClient = createMockHttpClient({
      success: true,
      link: "https://sdx.suscripcion.toyotaplan.com.ar/?external=abc"
    });

    const service = new ToyotaPlanService(
      new ToyotaPlanCatalogService([catalogItem]),
      new ToyotaPlanAuthService(config, authHttpClient),
      generateHttpClient,
      config
    );

    await service.generateSubscriptionLink(catalogItem.slug, {
      ip: "127.0.0.1",
      userAgent: "vitest-agent"
    });

    const lines = consoleSpy.mock.calls.map(([line]) => String(line));
    expect(
      lines.some((line) => line.includes('"message":"toyota_plan.link_generation.started"'))
    ).toBe(true);
    expect(
      lines.some((line) => line.includes('"message":"toyota_plan.link_generation.success"'))
    ).toBe(true);
  });

  it("generates a subscription link with mocked external APIs", async () => {
    const authHttpClient = createMockHttpClient({
      access_token: "token-1",
      expires_in: 3600,
      token_type: "Bearer"
    });
    const generateHttpClient = createMockHttpClient({
      success: true,
      link: "https://sdx.suscripcion.toyotaplan.com.ar/?external=abc"
    });

    const service = new ToyotaPlanService(
      new ToyotaPlanCatalogService([catalogItem]),
      new ToyotaPlanAuthService(config, authHttpClient),
      generateHttpClient,
      config
    );

    await expect(service.generateSubscriptionLink(catalogItem.slug)).resolves.toEqual({
      success: true,
      link: "https://sdx.suscripcion.toyotaplan.com.ar/?external=abc",
      model: catalogItem.modelDescription,
      plan: catalogItem.planDescription,
      amount: 558824.14
    });

    expect(authHttpClient.post).toHaveBeenCalledTimes(1);
    expect(generateHttpClient.post).toHaveBeenCalledWith(
      config.generateLinkUrl,
      {
        modelId: "114",
        planId: "113",
        amount: 558824.14,
        seller: "HOM"
      },
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer token-1"
        })
      })
    );
  });

  it("refreshes the token and retries once when Toyota Plan reports token expiration", async () => {
    const authHttpClient = createMockHttpClient(
      {
        access_token: "expired-token",
        expires_in: 3600,
        token_type: "Bearer"
      },
      {
        access_token: "fresh-token",
        expires_in: 3600,
        token_type: "Bearer"
      }
    );
    const generateHttpClient = createMockHttpClient(tokenExpiredError, {
      success: true,
      link: "https://sdx.suscripcion.toyotaplan.com.ar/?external=fresh"
    });

    const service = new ToyotaPlanService(
      new ToyotaPlanCatalogService([catalogItem]),
      new ToyotaPlanAuthService(config, authHttpClient),
      generateHttpClient,
      config
    );

    await expect(service.generateSubscriptionLink(catalogItem.slug)).resolves.toMatchObject({
      success: true,
      link: "https://sdx.suscripcion.toyotaplan.com.ar/?external=fresh"
    });

    expect(authHttpClient.post).toHaveBeenCalledTimes(2);
    expect(generateHttpClient.post).toHaveBeenCalledTimes(2);
    expect(generateHttpClient.post).toHaveBeenLastCalledWith(
      config.generateLinkUrl,
      expect.any(Object),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer fresh-token"
        })
      })
    );
  });

  it("rejects an unexpected Toyota Plan link host", async () => {
    const authHttpClient = createMockHttpClient({
      access_token: "token-1",
      expires_in: 3600,
      token_type: "Bearer"
    });
    const generateHttpClient = createMockHttpClient({
      success: true,
      link: "https://unexpected.example.com/?external=abc"
    });

    const service = new ToyotaPlanService(
      new ToyotaPlanCatalogService([catalogItem]),
      new ToyotaPlanAuthService(config, authHttpClient),
      generateHttpClient,
      config
    );

    await expect(service.generateSubscriptionLink(catalogItem.slug)).rejects.toThrow(
      "Toyota Plan integration error"
    );
  });

  it("does not retry generateLink automatically on timeout", async () => {
    const authHttpClient = createMockHttpClient({
      access_token: "token-1",
      expires_in: 3600,
      token_type: "Bearer"
    });
    const generateHttpClient = createMockHttpClient(timeoutError);

    const service = new ToyotaPlanService(
      new ToyotaPlanCatalogService([catalogItem]),
      new ToyotaPlanAuthService(config, authHttpClient),
      generateHttpClient,
      config
    );

    await expect(service.generateSubscriptionLink(catalogItem.slug)).rejects.toThrow(
      "Toyota Plan integration error"
    );
    expect(generateHttpClient.post).toHaveBeenCalledTimes(1);
  });
});
