import { describe, expect, it } from "vitest";
import { generateLinkBodySchema } from "../src/modules/toyotaPlan/toyotaPlan.schemas";

describe("generateLinkBodySchema", () => {
  it("accepts a valid slug", () => {
    expect(
      generateLinkBodySchema.parse({
        slug: "hilux-4x4-dc-dx-24-tdi-at-plan-100"
      })
    ).toEqual({
      slug: "hilux-4x4-dc-dx-24-tdi-at-plan-100"
    });
  });

  it("rejects requests without slug", () => {
    expect(() => generateLinkBodySchema.parse({})).toThrow();
  });

  it("rejects non-string slug values", () => {
    expect(() => generateLinkBodySchema.parse({ slug: 123 })).toThrow();
  });
});
