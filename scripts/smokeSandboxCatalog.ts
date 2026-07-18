export {
  buildSmokeCatalogSummary,
  renderSmokeCatalogMarkdown,
  type SmokeCatalogResult,
  type SmokeCatalogSummary
} from "./smokeCatalogRunner";

import { runSmokeCatalog } from "./smokeCatalogRunner";

if (require.main === module) {
  void runSmokeCatalog({
    requiredEnvironment: "sandbox",
    outputFile: "Docs/sandbox-catalog-validation-log.md",
    reportTitle: "Sandbox Catalog Validation Log",
    startMessage: "Starting sandbox catalog smoke validation",
    finishMessage: "Sandbox catalog smoke validation finished"
  }).catch((error) => {
    console.error(
      JSON.stringify({
        message: "Sandbox catalog smoke validation aborted",
        error: error instanceof Error ? error.message : "Unknown error"
      })
    );
    process.exitCode = 1;
  });
}
