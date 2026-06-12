import catalog from "../src/config/toyota-plan.catalog.json";
import {
  AMOUNT_TOLERANCE,
  SHEET_CSV_URL,
  type SheetCatalogRow,
  buildModelPlanKey,
  compareCatalogWithSheetRows,
  fetchSheetCsv,
  parseAmount,
  parseSheetCatalogRows,
  renderCatalogCompareMarkdown,
  writeMarkdownFile,
  CATALOG_COMPARE_REPORT_FILE
} from "../src/utils/catalogSheet";

export {
  AMOUNT_TOLERANCE,
  SHEET_CSV_URL,
  type SheetCatalogRow,
  buildModelPlanKey,
  compareCatalogWithSheetRows,
  parseAmount,
  parseSheetCatalogRows
} from "../src/utils/catalogSheet";

const run = async (): Promise<void> => {
  const csv = await fetchSheetCsv();
  const sheetRows = parseSheetCatalogRows(csv);
  const report = compareCatalogWithSheetRows(catalog, sheetRows);
  const markdown = renderCatalogCompareMarkdown(new Date().toISOString(), report);

  await writeMarkdownFile(CATALOG_COMPARE_REPORT_FILE, markdown);

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
      outputFile: "Docs/catalog-sheet-compare-report.md"
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
