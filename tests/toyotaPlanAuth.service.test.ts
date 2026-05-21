import { afterEach, describe, expect, it, vi } from "vitest";
import { ToyotaPlanAuthService } from "../src/modules/toyotaPlan/toyotaPlanAuth.service";
import { ToyotaPlanRuntimeConfig } from "../src/modules/toyotaPlan/toyotaPlan.types";
import { HttpClient } from "../src/utils/httpClient";
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

const createDeferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
};

describe("ToyotaPlanAuthService", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    resetMetrics();
  });

  it("emits business logs for oauth refresh lifecycle", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const httpClient: HttpClient = {
      post: vi.fn().mockResolvedValue({
        access_token: "shared-token",
        expires_in: 3600,
        token_type: "Bearer"
      })
    };
    const service = new ToyotaPlanAuthService(config, httpClient);

    await service.getAccessToken();

    const lines = consoleSpy.mock.calls.map(([line]) => String(line));
    expect(lines.some((line) => line.includes('"message":"toyota_plan.oauth.refresh.started"'))).toBe(
      true
    );
    expect(lines.some((line) => line.includes('"message":"toyota_plan.oauth.refresh.success"'))).toBe(
      true
    );
  });

  it("retries OAuth once on transient 503 and then succeeds", async () => {
    const httpClient: HttpClient = {
      post: vi
        .fn()
        .mockRejectedValueOnce(
          Object.assign(new Error("Service unavailable"), {
            response: {
              status: 503,
              data: {
                message: "Service unavailable"
              }
            }
          })
        )
        .mockResolvedValueOnce({
          access_token: "recovered-token",
          expires_in: 3600,
          token_type: "Bearer"
        })
    };
    const service = new ToyotaPlanAuthService(config, httpClient);

    await expect(service.getAccessToken()).resolves.toBe("recovered-token");
    expect(httpClient.post).toHaveBeenCalledTimes(2);
  });

  it("does not retry OAuth on invalid_client", async () => {
    const httpClient: HttpClient = {
      post: vi.fn().mockRejectedValueOnce(
        Object.assign(new Error("invalid_client"), {
          response: {
            status: 400,
            data: {
              error: "invalid_client"
            }
          }
        })
      )
    };
    const service = new ToyotaPlanAuthService(config, httpClient);

    await expect(service.getAccessToken()).rejects.toThrow("Toyota Plan integration error");
    expect(httpClient.post).toHaveBeenCalledTimes(1);
  });

  it("deduplicates concurrent token refreshes", async () => {
    const deferred = createDeferred<{
      access_token: string;
      expires_in: number;
      token_type: string;
    }>();
    const httpClient: HttpClient = {
      post: vi.fn().mockReturnValue(deferred.promise)
    };
    const service = new ToyotaPlanAuthService(config, httpClient);

    const tokenPromises = Array.from({ length: 10 }, () => service.getAccessToken());

    expect(httpClient.post).toHaveBeenCalledTimes(1);

    deferred.resolve({
      access_token: "shared-token",
      expires_in: 3600,
      token_type: "Bearer"
    });

    await expect(Promise.all(tokenPromises)).resolves.toEqual(Array(10).fill("shared-token"));
    expect(httpClient.post).toHaveBeenCalledTimes(1);
  });

  it("clears tokenRefreshPromise after a failed refresh so a later attempt can retry", async () => {
    const httpClient: HttpClient = {
      post: vi
        .fn()
        .mockRejectedValueOnce(new Error("OAuth unavailable"))
        .mockResolvedValueOnce({
          access_token: "retry-token",
          expires_in: 3600,
          token_type: "Bearer"
        })
    };
    const service = new ToyotaPlanAuthService(config, httpClient);

    await expect(
      Promise.allSettled(Array.from({ length: 5 }, () => service.getAccessToken()))
    ).resolves.toEqual(
      Array(5).fill(
        expect.objectContaining({
          status: "rejected"
        })
      )
    );
    expect(httpClient.post).toHaveBeenCalledTimes(1);

    await expect(service.getAccessToken()).resolves.toBe("retry-token");
    expect(httpClient.post).toHaveBeenCalledTimes(2);
  });
});
