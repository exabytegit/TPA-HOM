import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app";
import { env } from "../src/config/env";
import { updateCatalogAmountsFromSheet } from "../src/modules/toyotaPlan/toyotaPlanCatalogUpdate.service";

vi.mock("../src/modules/toyotaPlan/toyotaPlanCatalogUpdate.service", () => ({
  updateCatalogAmountsFromSheet: vi.fn()
}));

describe("admin catalog update endpoint", () => {
  const originalNodeEnv = env.NODE_ENV;

  afterEach(() => {
    env.NODE_ENV = originalNodeEnv;
    vi.clearAllMocks();
  });

  it("rejects update requests without an admin session token", async () => {
    await request(createApp({ serveDevCatalog: true }))
      .post("/api/dev/admin/catalog/update-amounts-from-sheet")
      .expect(401);
  });

  it("updates catalog amounts when a valid admin session token is provided", async () => {
    const loginResponse = await request(createApp({ serveDevCatalog: true }))
      .post("/api/dev/admin/login")
      .send({
        username: env.ADMIN_USERNAME,
        password: env.ADMIN_PASSWORD
      })
      .expect(200);

    const adminSessionToken = loginResponse.body.adminSessionToken as string;

    vi.mocked(updateCatalogAmountsFromSheet).mockResolvedValue({
      success: true,
      updatedCount: 1,
      unchangedCount: 8,
      sheetOnlyCount: 0,
      catalogOnlyCount: 0,
      backupCreated: true,
      reportPath: "Docs/catalog-update-report.md",
      message: "Catalogo actualizado desde el Sheet publico.",
      changes: [
        {
          modelId: "111",
          planId: "113",
          oldAmount: 639161.64,
          newAmount: 639398,
          slug: "hiace-furgon-l2h2-28-tdi-at-plan-100"
        }
      ]
    });

    const response = await request(createApp({ serveDevCatalog: true }))
      .post("/api/dev/admin/catalog/update-amounts-from-sheet")
      .set("x-admin-session", adminSessionToken)
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      updatedCount: 1,
      unchangedCount: 8,
      sheetOnlyCount: 0,
      catalogOnlyCount: 0,
      backupCreated: true,
      reportPath: "Docs/catalog-update-report.md",
      message: "Catalogo actualizado desde el Sheet publico.",
      changes: [
        {
          modelId: "111",
          planId: "113",
          oldAmount: 639161.64,
          newAmount: 639398,
          slug: "hiace-furgon-l2h2-28-tdi-at-plan-100"
        }
      ]
    });
  });

  it("does not expose the admin update endpoint in production", async () => {
    env.NODE_ENV = "production";

    await request(createApp())
      .post("/api/dev/admin/catalog/update-amounts-from-sheet")
      .expect(404);
  });
});
