import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { env } from "../src/config/env";
import { AppError } from "../src/utils/appError";
import { sanitizeForLog } from "../src/utils/logger";
import { toyotaPlanCatalogService } from "../src/modules/toyotaPlan/toyotaPlanCatalog.service";
import { toyotaPlanService } from "../src/modules/toyotaPlan/toyotaPlan.service";

export interface SmokeCatalogResult {
  slug: string;
  modelId: string;
  planId: string;
  seller: string;
  amount: number;
  success: boolean;
  status: "ok" | "error";
  linkHost?: string;
  error?: string;
}

export interface SmokeCatalogSummary {
  totalItems: number;
  successCount: number;
  failedCount: number;
  failedItems: Array<Pick<SmokeCatalogResult, "slug" | "error">>;
}

export interface SmokeCatalogRunOptions {
  requiredEnvironment: "sandbox" | "production";
  outputFile: string;
  reportTitle: string;
  startMessage: string;
  finishMessage: string;
}

export const buildSmokeCatalogSummary = (
  results: SmokeCatalogResult[]
): SmokeCatalogSummary => {
  const failedItems = results
    .filter((result) => !result.success)
    .map((result) => ({
      slug: result.slug,
      error: result.error ?? "Unknown error"
    }));

  return {
    totalItems: results.length,
    successCount: results.filter((result) => result.success).length,
    failedCount: failedItems.length,
    failedItems
  };
};

export const renderSmokeCatalogMarkdown = (
  reportTitle: string,
  executedAt: string,
  results: SmokeCatalogResult[],
  summary: SmokeCatalogSummary
): string => {
  const rows = results
    .map(
      (result) =>
        `| ${result.slug} | ${result.modelId} | ${result.planId} | ${result.seller} | ${result.amount.toFixed(2)} | ${result.status} | ${result.linkHost ?? "-"} | ${result.error ?? "-"} |`
    )
    .join("\n");

  const failedRows =
    summary.failedItems.length === 0
      ? "- none"
      : summary.failedItems.map((item) => `- \`${item.slug}\`: ${item.error}`).join("\n");

  return `# ${reportTitle}

## Last Run

- executed_at: ${executedAt}
- environment: ${env.TOYOTA_PLAN_ENV}
- total_items: ${summary.totalItems}
- success_count: ${summary.successCount}
- failed_count: ${summary.failedCount}

## Results

| slug | modelId | planId | seller | amount | status | link_host | error |
|---|---:|---:|---|---:|---|---|---|
${rows}

## Failed Items

${failedRows}
`;
};

const ensureExecutionEnvironment = (requiredEnvironment: "sandbox" | "production"): void => {
  if (env.TOYOTA_PLAN_ENV !== requiredEnvironment) {
    throw new Error(`smoke:${requiredEnvironment} can run only when TOYOTA_PLAN_ENV=${requiredEnvironment}`);
  }
};

const ensureCredentials = (requiredEnvironment: "sandbox" | "production"): void => {
  if (!env.TOYOTA_PLAN_CLIENT_ID || !env.TOYOTA_PLAN_CLIENT_SECRET) {
    throw new Error(`smoke:${requiredEnvironment} requires local credentials in .env`);
  }
};

const toResultError = (error: unknown): string => {
  if (error instanceof AppError) {
    return `${error.code}: ${error.message}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  const sanitized = sanitizeForLog(error);
  return typeof sanitized === "string" ? sanitized : JSON.stringify(sanitized);
};

export const runSmokeCatalog = async ({
  requiredEnvironment,
  outputFile,
  reportTitle,
  startMessage,
  finishMessage
}: SmokeCatalogRunOptions): Promise<void> => {
  ensureExecutionEnvironment(requiredEnvironment);
  ensureCredentials(requiredEnvironment);

  const enabledItems = toyotaPlanCatalogService.getCatalog().filter((item) => item.enabled);
  const results: SmokeCatalogResult[] = [];

  console.log(
    JSON.stringify({
      message: startMessage,
      environment: env.TOYOTA_PLAN_ENV,
      totalItems: enabledItems.length
    })
  );

  for (const item of enabledItems) {
    try {
      const response = await toyotaPlanService.generateSubscriptionLink(item.slug, {
        ip: `smoke:${requiredEnvironment}`,
        userAgent: `smoke-${requiredEnvironment}-catalog-script`
      });
      const parsedLink = new URL(response.link);

      const result: SmokeCatalogResult = {
        slug: item.slug,
        modelId: item.modelId,
        planId: item.planId,
        seller: item.seller,
        amount: item.amount,
        success: true,
        status: "ok",
        linkHost: parsedLink.hostname
      };

      results.push(result);
      console.log(JSON.stringify(result));
    } catch (error) {
      const result: SmokeCatalogResult = {
        slug: item.slug,
        modelId: item.modelId,
        planId: item.planId,
        seller: item.seller,
        amount: item.amount,
        success: false,
        status: "error",
        error: toResultError(error)
      };

      results.push(result);
      console.log(JSON.stringify(result));
    }
  }

  const summary = buildSmokeCatalogSummary(results);
  const executedAt = new Date().toISOString();
  const markdown = renderSmokeCatalogMarkdown(reportTitle, executedAt, results, summary);
  const resolvedOutputPath = resolve(process.cwd(), outputFile);

  await writeFile(resolvedOutputPath, markdown, "utf8");

  console.log(
    JSON.stringify({
      message: finishMessage,
      ...summary,
      outputFile
    })
  );
};
