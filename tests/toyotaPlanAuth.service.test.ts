import { describe, expect, it, vi } from "vitest";
import { ToyotaPlanAuthService } from "../src/modules/toyotaPlan/toyotaPlanAuth.service";
import { ToyotaPlanRuntimeConfig } from "../src/modules/toyotaPlan/toyotaPlan.types";
import { HttpClient } from "../src/utils/httpClient";

const config: ToyotaPlanRuntimeConfig = {
  environment: "sandbox",
  seller: "HOM",
  scope: "ext-link/write",
  clientId: "client-id",
  clientSecret: "client-secret",
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
