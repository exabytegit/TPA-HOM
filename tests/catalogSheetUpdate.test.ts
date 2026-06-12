import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildCatalogAmountUpdatePlan } from "../src/utils/catalogSheet";
import { updateCatalogAmountsFromSheet } from "../src/modules/toyotaPlan/toyotaPlanCatalogUpdate.service";

const sampleCatalog = [
  {
    slug: "hilux-4x4-dc-dx-24-tdi-at-plan-100",
    modelId: "114",
    modelDescription: "HILUX 4X4 D/C DX 2.4 TDI 6 A/T",
    planId: "113",
    planDescription: "PLAN 100% DIF G 84M",
    amount: 558824.14,
    seller: "HOM" as const,
    enabled: true
  },
  {
    slug: "hiace-furgon-l2h2-28-tdi-at-plan-100",
    modelId: "111",
    modelDescription: "HIACE FURGON L2H2 2.8 TDI 6AT 3A 5P",
    planId: "113",
    planDescription: "PLAN 100% DIF G 84M",
    amount: 639161.64,
    seller: "HOM" as const,
    enabled: true
  }
];

const sampleSheetRows = [
  {
    modelId: "114",
    modelDescription: "HILUX 4X4 D/C DX 2.4 TDI 6 A/T",
    planId: "113",
    planDescription: "PLAN 100% DIF G 84M",
    amount: 600000
  },
  {
    modelId: "111",
    modelDescription: "HIACE FURGON L2H2 2.8 TDI 6AT 3A 5P",
    planId: "113",
    planDescription: "PLAN 100% DIF G 84M",
    amount: 639161.64
  }
];

describe("catalog sheet update helpers", () => {
  it("updates only amount and preserves the rest of the catalog fields", () => {
    const plan = buildCatalogAmountUpdatePlan(sampleCatalog, sampleSheetRows);

    expect(plan.updatedCount).toBe(1);
    expect(plan.unchangedCount).toBe(1);
    expect(plan.changes[0]).toMatchObject({
      slug: "hilux-4x4-dc-dx-24-tdi-at-plan-100",
      modelId: "114",
      planId: "113",
      oldAmount: 558824.14,
      newAmount: 600000
    });
    expect(plan.updatedCatalog).toMatchObject([
      {
        slug: "hilux-4x4-dc-dx-24-tdi-at-plan-100",
        modelId: "114",
        planId: "113",
        seller: "HOM",
        amount: 600000
      },
      {
        slug: "hiace-furgon-l2h2-28-tdi-at-plan-100",
        modelId: "111",
        planId: "113",
        seller: "HOM",
        amount: 639161.64
      }
    ]);
  });

  it("keeps the catalog unchanged when the sheet is already synchronized", () => {
    const plan = buildCatalogAmountUpdatePlan(sampleCatalog, [
      {
        modelId: "114",
        modelDescription: "HILUX 4X4 D/C DX 2.4 TDI 6 A/T",
        planId: "113",
        planDescription: "PLAN 100% DIF G 84M",
        amount: 558824.14
      },
      {
        modelId: "111",
        modelDescription: "HIACE FURGON L2H2 2.8 TDI 6AT 3A 5P",
        planId: "113",
        planDescription: "PLAN 100% DIF G 84M",
        amount: 639161.64
      }
    ]);

    expect(plan.updatedCount).toBe(0);
    expect(plan.unchangedCount).toBe(2);
    expect(plan.updatedCatalog).toEqual(sampleCatalog);
  });

  it("writes backup and catalog files when there are amount changes", async () => {
    const baseDir = await mkdtemp(join(tmpdir(), "tpa-hom-update-"));
    const catalogFilePath = join(baseDir, "toyota-plan.catalog.json");
    const backupDir = join(baseDir, "backups");
    const reportFilePath = join(baseDir, "catalog-update-report.md");

    await writeFile(catalogFilePath, `${JSON.stringify(sampleCatalog, null, 2)}\n`, "utf8");

    const result = await updateCatalogAmountsFromSheet({
      catalogFilePath,
      backupDir,
      reportFilePath,
      catalog: sampleCatalog,
      sheetRows: sampleSheetRows
    });

    expect(result.updatedCount).toBe(1);
    expect(result.backupCreated).toBe(true);
    expect(result.reportPath).toBe("Docs/catalog-update-report.md");

    const writtenCatalog = JSON.parse(await readFile(catalogFilePath, "utf8")) as Array<{ amount: number }>;
    expect(writtenCatalog[0].amount).toBe(600000);
    expect(writtenCatalog[1].amount).toBe(639161.64);

    const backupFiles = await stat(backupDir);
    expect(backupFiles.isDirectory()).toBe(true);

    const report = await readFile(reportFilePath, "utf8");
    expect(report).toContain("Catalog Update Report");
    expect(report).toContain("Se actualizaron 1 importes");

    await rm(baseDir, { recursive: true, force: true });
  });

  it("does not write the catalog when there are no changes", async () => {
    const baseDir = await mkdtemp(join(tmpdir(), "tpa-hom-update-nochange-"));
    const catalogFilePath = join(baseDir, "toyota-plan.catalog.json");
    const backupDir = join(baseDir, "backups");
    const reportFilePath = join(baseDir, "catalog-update-report.md");

    await writeFile(catalogFilePath, `${JSON.stringify(sampleCatalog, null, 2)}\n`, "utf8");
    const before = await readFile(catalogFilePath, "utf8");

    const result = await updateCatalogAmountsFromSheet({
      catalogFilePath,
      backupDir,
      reportFilePath,
      catalog: sampleCatalog,
      sheetRows: [
        {
          modelId: "114",
          modelDescription: "HILUX 4X4 D/C DX 2.4 TDI 6 A/T",
          planId: "113",
          planDescription: "PLAN 100% DIF G 84M",
          amount: 558824.14
        },
        {
          modelId: "111",
          modelDescription: "HIACE FURGON L2H2 2.8 TDI 6AT 3A 5P",
          planId: "113",
          planDescription: "PLAN 100% DIF G 84M",
          amount: 639161.64
        }
      ]
    });

    const after = await readFile(catalogFilePath, "utf8");
    expect(result.updatedCount).toBe(0);
    expect(result.backupCreated).toBe(false);
    expect(after).toBe(before);

    await expect(stat(backupDir)).rejects.toThrow();
    const report = await readFile(reportFilePath, "utf8");
    expect(report).toContain("El catálogo ya está sincronizado con el Sheet.");

    await rm(baseDir, { recursive: true, force: true });
  });
});
