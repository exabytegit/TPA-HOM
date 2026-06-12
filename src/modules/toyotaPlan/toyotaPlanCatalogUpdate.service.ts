import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  buildCatalogAmountUpdatePlan,
  CATALOG_BACKUP_DIR,
  CATALOG_UPDATE_REPORT_FILE,
  LocalCatalogItem,
  SheetCatalogRow,
  writeMarkdownFile
} from "../../utils/catalogSheet";
import { fetchToyotaPlanSheetRows } from "../../utils/toyotaPlanSheet";
import { toyotaPlanCatalogService } from "./toyotaPlanCatalog.service";

export interface CatalogAmountUpdateChange {
  modelId: string;
  planId: string;
  oldAmount: number;
  newAmount: number;
  slug: string;
}

export interface CatalogAmountUpdateResult {
  success: true;
  updatedCount: number;
  unchangedCount: number;
  sheetOnlyCount: number;
  catalogOnlyCount: number;
  backupCreated: boolean;
  reportPath: string;
  message: string;
  changes: CatalogAmountUpdateChange[];
}

export interface UpdateCatalogAmountsOptions {
  catalogFilePath?: string;
  backupDir?: string;
  reportFilePath?: string;
  sheetRows?: SheetCatalogRow[];
  catalog?: LocalCatalogItem[];
}

const formatTimestamp = (date: Date): string => {
  const pad = (value: number): string => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join("") + `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
};

export const updateCatalogAmountsFromSheet = async (
  options: UpdateCatalogAmountsOptions = {}
): Promise<CatalogAmountUpdateResult> => {
  const catalogFilePath = options.catalogFilePath ?? resolve(process.cwd(), "src/config/toyota-plan.catalog.json");
  const backupDir = options.backupDir ?? CATALOG_BACKUP_DIR;
  const reportFilePath = options.reportFilePath ?? CATALOG_UPDATE_REPORT_FILE;
  const currentCatalog = options.catalog ?? toyotaPlanCatalogService.getCatalog();
  const sheetRows = options.sheetRows ?? (await fetchToyotaPlanSheetRows());
  const plan = buildCatalogAmountUpdatePlan(currentCatalog, sheetRows);

  const markdown = `# Catalog Update Report

## Last Run

- executed_at: ${new Date().toISOString()}
- source: Google Sheet public CSV
- catalog_file: src/config/toyota-plan.catalog.json
- updated_count: ${plan.updatedCount}
- unchanged_count: ${plan.unchangedCount}
- sheet_only_count: ${plan.sheetOnlyCount}
- catalog_only_count: ${plan.catalogOnlyCount}
- backup_created: ${plan.updatedCount > 0 ? "true" : "false"}

## Summary

${plan.updatedCount === 0
    ? "El catálogo ya está sincronizado con el Sheet."
    : `Se actualizaron ${plan.updatedCount} importes del catálogo local sin modificar slug, modelId, planId ni seller.`
}

## Changes

| model_id | plan_id | slug | old_amount | new_amount | difference |
|---|---|---|---:|---:|---:|
${plan.changes.length === 0
    ? "| - | - | - | - | - | - |\n"
    : plan.changes
        .map(
          (change) =>
            `| ${change.modelId} | ${change.planId} | ${change.slug} | ${change.oldAmount.toFixed(2)} | ${change.newAmount.toFixed(2)} | ${(change.difference).toFixed(2)} |`
        )
        .join("\n")
}

## Scope

This update only changes the amount field. It does not add, remove, or reassign catalog entries.
`;

  await writeMarkdownFile(reportFilePath, markdown);

  if (plan.updatedCount === 0) {
    return {
      success: true,
      updatedCount: 0,
      unchangedCount: plan.unchangedCount,
      sheetOnlyCount: plan.sheetOnlyCount,
      catalogOnlyCount: plan.catalogOnlyCount,
      backupCreated: false,
      reportPath: "Docs/catalog-update-report.md",
      message: "El catálogo ya está sincronizado con el Sheet.",
      changes: []
    };
  }

  const timestamp = formatTimestamp(new Date());
  const backupPath = resolve(backupDir, `toyota-plan.catalog.${timestamp}.json`);

  await mkdir(backupDir, { recursive: true });
  await copyFile(catalogFilePath, backupPath);
  await writeFile(catalogFilePath, `${JSON.stringify(plan.updatedCatalog, null, 2)}\n`, "utf8");
  toyotaPlanCatalogService.replaceCatalog(plan.updatedCatalog);

  return {
    success: true,
    updatedCount: plan.updatedCount,
    unchangedCount: plan.unchangedCount,
    sheetOnlyCount: plan.sheetOnlyCount,
    catalogOnlyCount: plan.catalogOnlyCount,
    backupCreated: true,
    reportPath: "Docs/catalog-update-report.md",
    message: "Catalogo actualizado desde el Sheet publico.",
    changes: plan.changes.map((change) => ({
      modelId: change.modelId,
      planId: change.planId,
      oldAmount: change.oldAmount,
      newAmount: change.newAmount,
      slug: change.slug
    }))
  };
};
