import { describe, expect, it } from "vitest";
import {
  buildModelPlanKey,
  compareCatalogWithSheetRows,
  parseAmount
} from "../scripts/compareCatalogWithSheet";

describe("compareCatalogWithSheet helpers", () => {
  it("parses Argentine currency amount", () => {
    expect(parseAmount("$ 558.824,14")).toBe(558824.14);
  });

  it("parses decimal dot amount", () => {
    expect(parseAmount("558824.14")).toBe(558824.14);
  });

  it("parses decimal comma amount", () => {
    expect(parseAmount("558824,14")).toBe(558824.14);
  });

  it("builds model-plan key", () => {
    expect(buildModelPlanKey(" 114 ", " 113 ")).toBe("114-113");
  });

  it("detects amount differences", () => {
    const report = compareCatalogWithSheetRows(
      [
        {
          slug: "hilux",
          modelId: "114",
          modelDescription: "HILUX",
          planId: "113",
          planDescription: "PLAN 100",
          amount: 558824.14,
          seller: "HOM",
          enabled: true
        }
      ],
      [
        {
          modelId: "114",
          modelDescription: "HILUX",
          planId: "113",
          planDescription: "PLAN 100",
          amount: 600000
        }
      ]
    );

    expect(report.exactMatches).toBe(0);
    expect(report.amountDifferences).toHaveLength(1);
    expect(report.amountDifferences[0]).toMatchObject({
      key: "114-113",
      slug: "hilux",
      localAmount: 558824.14,
      sheetAmount: 600000
    });
  });
});
