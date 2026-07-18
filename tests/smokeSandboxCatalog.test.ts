import { describe, expect, it } from "vitest";
import {
  buildSmokeCatalogSummary,
  renderSmokeCatalogMarkdown,
  SmokeCatalogResult
} from "../scripts/smokeSandboxCatalog";

describe("smokeSandboxCatalog helpers", () => {
  it("builds summary counts and failed items", () => {
    const results: SmokeCatalogResult[] = [
      {
        slug: "ok-item",
        modelId: "114",
        planId: "113",
        seller: "HOM",
        amount: 558824.14,
        success: true,
        status: "ok",
        linkHost: "sdx.suscripcion.toyotaplan.com.ar"
      },
      {
        slug: "failed-item",
        modelId: "115",
        planId: "115",
        seller: "HOM",
        amount: 465393.18,
        success: false,
        status: "error",
        error: "TOYOTA_PLAN_LINK_ERROR: Toyota Plan integration error"
      }
    ];

    expect(buildSmokeCatalogSummary(results)).toEqual({
      totalItems: 2,
      successCount: 1,
      failedCount: 1,
      failedItems: [
        {
          slug: "failed-item",
          error: "TOYOTA_PLAN_LINK_ERROR: Toyota Plan integration error"
        }
      ]
    });
  });

  it("renders markdown without including full links", () => {
    const results: SmokeCatalogResult[] = [
      {
        slug: "ok-item",
        modelId: "114",
        planId: "113",
        seller: "HOM",
        amount: 558824.14,
        success: true,
        status: "ok",
        linkHost: "sdx.suscripcion.toyotaplan.com.ar"
      }
    ];
    const summary = buildSmokeCatalogSummary(results);
    const markdown = renderSmokeCatalogMarkdown(
      "Sandbox Catalog Validation Log",
      "2026-05-21T00:00:00.000Z",
      results,
      summary
    );

    expect(markdown).toContain("sdx.suscripcion.toyotaplan.com.ar");
    expect(markdown).not.toContain("?external=");
  });
});
