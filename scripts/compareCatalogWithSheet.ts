import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import catalog from "../src/config/toyota-plan.catalog.json";

export const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1F4kUAccg2aS2iGfyYkGXzAhAARy0SErQdlvT3NS-sGo/export?format=csv";

const OUTPUT_FILE = "Docs/catalog-sheet-compare-report.md";
export const AMOUNT_TOLERANCE = 0.005;

export interface SheetCatalogRow {
  modelId: string;
  modelDescription: string;
  planId: string;
  planDescription: string;
  amount: number;
}

export interface LocalCatalogItem {
  slug: string;
  modelId: string;
  modelDescription: string;
  planId: string;
  planDescription: string;
  amount: number;
  seller: string;
  enabled: boolean;
}

export interface AmountDifference {
  key: string;
  slug: string;
  modelDescription: string;
  planDescription: string;
  localAmount: number;
  sheetAmount: number;
  difference: number;
}

export interface DescriptionDifference {
  key: string;
  slug: string;
  localModelDescription: string;
  sheetModelDescription: string;
  localPlanDescription: string;
  sheetPlanDescription: string;
}

export interface CatalogCompareReport {
  totalSheetRows: number;
  totalCatalogItems: number;
  exactMatches: number;
  amountDifferences: AmountDifference[];
  sheetOnly: SheetCatalogRow[];
  catalogOnly: LocalCatalogItem[];
  descriptionDifferences: DescriptionDifference[];
}

export const buildModelPlanKey = (modelId: string, planId: string): string =>
  `${modelId.trim()}-${planId.trim()}`;

export const parseAmount = (rawValue: string): number => {
  const cleaned = rawValue
    .replace(/\u00a0/g, " ")
    .replace(/\$/g, "")
    .replace(/\s/g, "")
    .replace(/[^\d,.-]/g, "");

  if (!cleaned) {
    throw new Error("Amount is empty");
  }

  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid amount: ${rawValue}`);
  }

  return parsed;
};

export const parseCsv = (csv: string): string[][] => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = "";
  let insideQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const nextChar = csv[index + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentValue += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === "," && !insideQuotes) {
      currentRow.push(currentValue);
      currentValue = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      currentRow.push(currentValue);
      rows.push(currentRow);
      currentRow = [];
      currentValue = "";
      continue;
    }

    currentValue += char;
  }

  if (currentValue.length > 0 || currentRow.length > 0) {
    currentRow.push(currentValue);
    rows.push(currentRow);
  }

  return rows.filter((row) => row.some((value) => value.trim() !== ""));
};

export const parseSheetCatalogRows = (csv: string): SheetCatalogRow[] => {
  const rows = parseCsv(csv);
  const [headers, ...dataRows] = rows;

  if (!headers) {
    throw new Error("Sheet CSV has no header row");
  }

  const headerIndex = new Map(headers.map((header, index) => [header.trim().toUpperCase(), index]));
  const requiredHeaders = ["ID MOD", "DESC MODELO", "ID PLAN", "DESC PLAN", "AMOUNT"];

  for (const header of requiredHeaders) {
    if (!headerIndex.has(header)) {
      throw new Error(`Missing required sheet column: ${header}`);
    }
  }

  return dataRows.map((row) => ({
    modelId: row[headerIndex.get("ID MOD") ?? -1]?.trim() ?? "",
    modelDescription: row[headerIndex.get("DESC MODELO") ?? -1]?.trim() ?? "",
    planId: row[headerIndex.get("ID PLAN") ?? -1]?.trim() ?? "",
    planDescription: row[headerIndex.get("DESC PLAN") ?? -1]?.trim() ?? "",
    amount: parseAmount(row[headerIndex.get("AMOUNT") ?? -1] ?? "")
  }));
};

const normalizeDescription = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

const amountsEqual = (left: number, right: number): boolean =>
  Math.abs(left - right) <= AMOUNT_TOLERANCE;

export const compareCatalogWithSheetRows = (
  localCatalog: LocalCatalogItem[],
  sheetRows: SheetCatalogRow[]
): CatalogCompareReport => {
  const sheetByKey = new Map<string, SheetCatalogRow>();
  const catalogByKey = new Map<string, LocalCatalogItem>();

  for (const row of sheetRows) {
    sheetByKey.set(buildModelPlanKey(row.modelId, row.planId), row);
  }

  for (const item of localCatalog) {
    catalogByKey.set(buildModelPlanKey(item.modelId, item.planId), item);
  }

  const amountDifferences: AmountDifference[] = [];
  const descriptionDifferences: DescriptionDifference[] = [];
  let exactMatches = 0;

  for (const item of localCatalog) {
    const key = buildModelPlanKey(item.modelId, item.planId);
    const sheetRow = sheetByKey.get(key);

    if (!sheetRow) {
      continue;
    }

    if (amountsEqual(item.amount, sheetRow.amount)) {
      exactMatches += 1;
    } else {
      amountDifferences.push({
        key,
        slug: item.slug,
        modelDescription: item.modelDescription,
        planDescription: item.planDescription,
        localAmount: item.amount,
        sheetAmount: sheetRow.amount,
        difference: sheetRow.amount - item.amount
      });
    }

    if (
      normalizeDescription(item.modelDescription) !== normalizeDescription(sheetRow.modelDescription) ||
      normalizeDescription(item.planDescription) !== normalizeDescription(sheetRow.planDescription)
    ) {
      descriptionDifferences.push({
        key,
        slug: item.slug,
        localModelDescription: item.modelDescription,
        sheetModelDescription: sheetRow.modelDescription,
        localPlanDescription: item.planDescription,
        sheetPlanDescription: sheetRow.planDescription
      });
    }
  }

  return {
    totalSheetRows: sheetRows.length,
    totalCatalogItems: localCatalog.length,
    exactMatches,
    amountDifferences,
    sheetOnly: sheetRows.filter((row) => !catalogByKey.has(buildModelPlanKey(row.modelId, row.planId))),
    catalogOnly: localCatalog.filter((item) => !sheetByKey.has(buildModelPlanKey(item.modelId, item.planId))),
    descriptionDifferences
  };
};

const formatAmount = (value: number): string => value.toFixed(2);

const renderAmountDifferenceRows = (differences: AmountDifference[]): string =>
  differences.length === 0
    ? "| - | - | - | - | - | - |\n"
    : differences
        .map(
          (item) =>
            `| ${item.key} | ${item.slug} | ${formatAmount(item.localAmount)} | ${formatAmount(item.sheetAmount)} | ${formatAmount(item.difference)} | ${item.modelDescription} / ${item.planDescription} |`
        )
        .join("\n");

const renderSheetOnlyRows = (rows: SheetCatalogRow[]): string =>
  rows.length === 0
    ? "| - | - | - | - |\n"
    : rows
        .map(
          (row) =>
            `| ${buildModelPlanKey(row.modelId, row.planId)} | ${row.modelDescription} | ${row.planDescription} | ${formatAmount(row.amount)} |`
        )
        .join("\n");

const renderCatalogOnlyRows = (rows: LocalCatalogItem[]): string =>
  rows.length === 0
    ? "| - | - | - | - |\n"
    : rows
        .map(
          (item) =>
            `| ${buildModelPlanKey(item.modelId, item.planId)} | ${item.slug} | ${item.modelDescription} | ${formatAmount(item.amount)} |`
        )
        .join("\n");

const renderDescriptionDifferenceRows = (rows: DescriptionDifference[]): string =>
  rows.length === 0
    ? "| - | - | - | - | - |\n"
    : rows
        .map(
          (item) =>
            `| ${item.key} | ${item.slug} | ${item.localModelDescription} | ${item.sheetModelDescription} | ${item.localPlanDescription} / ${item.sheetPlanDescription} |`
        )
        .join("\n");

export const renderCatalogCompareMarkdown = (
  executedAt: string,
  report: CatalogCompareReport
): string => `# Catalog vs Google Sheet Compare Report

## Last Run

- executed_at: ${executedAt}
- source: Google Sheet public CSV
- local_catalog: src/config/toyota-plan.catalog.json
- total_rows_sheet: ${report.totalSheetRows}
- total_items_catalog: ${report.totalCatalogItems}
- exact_amount_matches: ${report.exactMatches}
- amount_differences: ${report.amountDifferences.length}
- sheet_only_items: ${report.sheetOnly.length}
- catalog_only_items: ${report.catalogOnly.length}
- possible_description_differences: ${report.descriptionDifferences.length}

## Scope

This report is read-only. It does not modify the local catalog, credentials, environment
variables, or Toyota Plan integration behavior.

## Amount Differences

| key | slug | local_amount | sheet_amount | difference_sheet_minus_local | description |
|---|---|---:|---:|---:|---|
${renderAmountDifferenceRows(report.amountDifferences)}

## Items In Sheet Not Found In Catalog

| key | sheet_model | sheet_plan | sheet_amount |
|---|---|---|---:|
${renderSheetOnlyRows(report.sheetOnly)}

## Items In Catalog Not Found In Sheet

| key | slug | local_model | local_amount |
|---|---|---|---:|
${renderCatalogOnlyRows(report.catalogOnly)}

## Possible Description Differences

| key | slug | local_model | sheet_model | local_plan / sheet_plan |
|---|---|---|---|---|
${renderDescriptionDifferenceRows(report.descriptionDifferences)}

## Recommendation

Review amount differences with Toyota Plan/TPA before updating
\`src/config/toyota-plan.catalog.json\`. This script intentionally does not change the catalog.
`;

const fetchSheetCsv = async (): Promise<string> => {
  const response = await fetch(SHEET_CSV_URL);

  if (!response.ok) {
    throw new Error(`Failed to fetch Google Sheet CSV: HTTP ${response.status}`);
  }

  return response.text();
};

const run = async (): Promise<void> => {
  const csv = await fetchSheetCsv();
  const sheetRows = parseSheetCatalogRows(csv);
  const report = compareCatalogWithSheetRows(catalog as LocalCatalogItem[], sheetRows);
  const markdown = renderCatalogCompareMarkdown(new Date().toISOString(), report);
  const outputPath = resolve(process.cwd(), OUTPUT_FILE);

  await writeFile(outputPath, markdown, "utf8");

  console.log(
    JSON.stringify({
      message: "Catalog sheet comparison finished",
      totalRowsSheet: report.totalSheetRows,
      totalItemsCatalog: report.totalCatalogItems,
      exactMatches: report.exactMatches,
      amountDifferences: report.amountDifferences.length,
      sheetOnlyItems: report.sheetOnly.length,
      catalogOnlyItems: report.catalogOnly.length,
      possibleDescriptionDifferences: report.descriptionDifferences.length,
      outputFile: OUTPUT_FILE
    })
  );
};

if (require.main === module) {
  void run().catch((error) => {
    console.error(
      JSON.stringify({
        message: "Catalog sheet comparison failed",
        error: error instanceof Error ? error.message : "Unknown error"
      })
    );
    process.exitCode = 1;
  });
}
