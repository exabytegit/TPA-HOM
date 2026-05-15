import { describe, expect, it } from "vitest";
import { AppError } from "../src/utils/appError";
import { ToyotaPlanCatalogService } from "../src/modules/toyotaPlan/toyotaPlanCatalog.service";
import { ToyotaPlanCatalogItem } from "../src/modules/toyotaPlan/toyotaPlan.types";

const enabledItem: ToyotaPlanCatalogItem = {
  slug: "enabled-item",
  modelId: "114",
  modelDescription: "HILUX",
  planId: "113",
  planDescription: "PLAN 100%",
  amount: 558824.14,
  seller: "HOM",
  enabled: true
};

describe("ToyotaPlanCatalogService", () => {
  it("finds an existing catalog item", () => {
    const service = new ToyotaPlanCatalogService([enabledItem]);

    expect(service.findCatalogItemBySlug("enabled-item")).toMatchObject({
      modelId: "114",
      planId: "113",
      amount: 558824.14
    });
  });

  it("rejects a missing slug", () => {
    const service = new ToyotaPlanCatalogService([enabledItem]);

    expect(() => service.getEnabledCatalogItemBySlug("missing")).toThrow(AppError);
    expect(() => service.getEnabledCatalogItemBySlug("missing")).toThrow("Catalog item not found");
  });

  it("rejects a disabled catalog item", () => {
    const service = new ToyotaPlanCatalogService([{ ...enabledItem, enabled: false }]);

    expect(() => service.getEnabledCatalogItemBySlug("enabled-item")).toThrow(
      "Catalog item disabled"
    );
  });
});
