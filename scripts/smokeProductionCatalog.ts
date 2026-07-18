import { runSmokeCatalog } from "./smokeCatalogRunner";

if (require.main === module) {
  void runSmokeCatalog({
    requiredEnvironment: "production",
    outputFile: "Docs/production-catalog-validation-log.md",
    reportTitle: "Production Catalog Validation Log",
    startMessage: "Starting production catalog smoke validation",
    finishMessage: "Production catalog smoke validation finished"
  }).catch((error) => {
    console.error(
      JSON.stringify({
        message: "Production catalog smoke validation aborted",
        error: error instanceof Error ? error.message : "Unknown error"
      })
    );
    process.exitCode = 1;
  });
}
