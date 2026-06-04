import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  AMOUNT_TOLERANCE,
  SHEET_CSV_URL,
  SheetCatalogRow,
  buildModelPlanKey,
  parseSheetCatalogRows
} from "./compareCatalogWithSheet";
import { env } from "../src/config/env";
import { toyotaPlanCatalogService } from "../src/modules/toyotaPlan/toyotaPlanCatalog.service";
import { toyotaPlanService } from "../src/modules/toyotaPlan/toyotaPlan.service";
import { AppError } from "../src/utils/appError";
import { sanitizeForLog } from "../src/utils/logger";

type SheetSmokeStatus =
  | "OK"
  | "TOYOTA_PLAN_LINK_REJECTED"
  | "TOYOTA_PLAN_UPSTREAM_ERROR"
  | "TOYOTA_PLAN_GENERATE_LINK_TIMEOUT"
  | "CATALOG_MATCH_NOT_FOUND"
  | "OTHER_ERROR";

interface SheetSmokeResult {
  modelId: string;
  planId: string;
  amount: number;
  slug: string;
  status: SheetSmokeStatus;
  code: string;
  detail: string;
  durationMs: number;
  linkHost?: string;
}

interface SheetSmokeSummary {
  totalRows: number;
  okCount: number;
  rejectCount: number;
  upstreamCount: number;
  timeoutCount: number;
  otherCount: number;
}

const OUTPUT_FILE = "Docs/sheet-smoke-report.md";
const REQUIRED_ENVIRONMENT = "sandbox";
const delayMs = Number(process.env.SHEET_SMOKE_DELAY_MS ?? "500");

const sleep = (ms: number): Promise<void> => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

const amountsEqual = (left: number, right: number): boolean =>
  Math.abs(left - right) <= AMOUNT_TOLERANCE;

const ensureSandboxExecution = (): void => {
  if (env.TOYOTA_PLAN_ENV !== REQUIRED_ENVIRONMENT) {
    throw new Error("smoke:sheet can run only when TOYOTA_PLAN_ENV=sandbox");
  }

  if (!env.TOYOTA_PLAN_CLIENT_ID || !env.TOYOTA_PLAN_CLIENT_SECRET) {
    throw new Error("smoke:sheet requires sandbox credentials in local .env");
  }

  if (!Number.isFinite(delayMs) || delayMs < 0) {
    throw new Error("SHEET_SMOKE_DELAY_MS must be a positive number");
  }
};

const fetchSheetCsv = async (): Promise<string> => {
  const response = await fetch(SHEET_CSV_URL);

  if (!response.ok) {
    throw new Error(`Failed to fetch Google Sheet CSV: HTTP ${response.status}`);
  }

  return response.text();
};

const findCatalogSlugForSheetRow = (row: SheetCatalogRow): string | null => {
  const key = buildModelPlanKey(row.modelId, row.planId);
  const catalogItem = toyotaPlanCatalogService
    .getCatalog()
    .find(
      (item) =>
        buildModelPlanKey(item.modelId, item.planId) === key && amountsEqual(item.amount, row.amount)
    );

  return catalogItem?.slug ?? null;
};

const classifyError = (error: unknown): Pick<SheetSmokeResult, "status" | "code" | "detail"> => {
  if (error instanceof AppError) {
    if (
      error.code === "TOYOTA_PLAN_LINK_REJECTED" ||
      error.code === "TOYOTA_PLAN_UPSTREAM_ERROR" ||
      error.code === "TOYOTA_PLAN_GENERATE_LINK_TIMEOUT"
    ) {
      return {
        status: error.code,
        code: error.code,
        detail: error.details?.upstreamMessage ?? error.message
      };
    }

    return {
      status: "OTHER_ERROR",
      code: error.code,
      detail: error.message
    };
  }

  if (error instanceof Error) {
    return {
      status: "OTHER_ERROR",
      code: "ERROR",
      detail: error.message
    };
  }

  const sanitized = sanitizeForLog(error);
  return {
    status: "OTHER_ERROR",
    code: "UNKNOWN_ERROR",
    detail: typeof sanitized === "string" ? sanitized : JSON.stringify(sanitized)
  };
};

const runSmokeForRow = async (row: SheetCatalogRow): Promise<SheetSmokeResult> => {
  const startedAt = Date.now();
  const slug = findCatalogSlugForSheetRow(row);

  if (!slug) {
    return {
      modelId: row.modelId,
      planId: row.planId,
      amount: row.amount,
      slug: "-",
      status: "CATALOG_MATCH_NOT_FOUND",
      code: "CATALOG_MATCH_NOT_FOUND",
      detail: "No local catalog item matched modelId, planId and amount from sheet",
      durationMs: Date.now() - startedAt
    };
  }

  try {
    const response = await toyotaPlanService.generateSubscriptionLink(slug, {
      ip: "smoke:sheet",
      userAgent: "smoke-sheet-catalog-script"
    });

    return {
      modelId: row.modelId,
      planId: row.planId,
      amount: row.amount,
      slug,
      status: "OK",
      code: "OK",
      detail: "success=true",
      durationMs: Date.now() - startedAt,
      linkHost: new URL(response.link).hostname
    };
  } catch (error) {
    const classified = classifyError(error);

    return {
      modelId: row.modelId,
      planId: row.planId,
      amount: row.amount,
      slug,
      ...classified,
      durationMs: Date.now() - startedAt
    };
  }
};

const buildSummary = (results: SheetSmokeResult[]): SheetSmokeSummary => ({
  totalRows: results.length,
  okCount: results.filter((result) => result.status === "OK").length,
  rejectCount: results.filter((result) => result.status === "TOYOTA_PLAN_LINK_REJECTED").length,
  upstreamCount: results.filter((result) => result.status === "TOYOTA_PLAN_UPSTREAM_ERROR").length,
  timeoutCount: results.filter((result) => result.status === "TOYOTA_PLAN_GENERATE_LINK_TIMEOUT").length,
  otherCount: results.filter(
    (result) =>
      result.status !== "OK" &&
      result.status !== "TOYOTA_PLAN_LINK_REJECTED" &&
      result.status !== "TOYOTA_PLAN_UPSTREAM_ERROR" &&
      result.status !== "TOYOTA_PLAN_GENERATE_LINK_TIMEOUT"
  ).length
});

const renderRows = (results: SheetSmokeResult[]): string =>
  results
    .map(
      (result) =>
        `| ${result.modelId} | ${result.planId} | ${result.amount.toFixed(2)} | ${result.slug} | ${result.status} | ${result.code} | ${result.linkHost ?? "-"} | ${result.durationMs} | ${result.detail} |`
    )
    .join("\n");

const renderMarkdown = (
  executedAt: string,
  results: SheetSmokeResult[],
  summary: SheetSmokeSummary
): string => `# Google Sheet Sandbox Smoke Report

## Last Run

- executed_at: ${executedAt}
- environment: ${env.TOYOTA_PLAN_ENV}
- source: Google Sheet public CSV
- delay_ms: ${delayMs}
- total_rows: ${summary.totalRows}
- ok_count: ${summary.okCount}
- reject_count: ${summary.rejectCount}
- upstream_transient_count: ${summary.upstreamCount}
- timeout_count: ${summary.timeoutCount}
- other_count: ${summary.otherCount}

## Scope

This report validates Google Sheet rows against Toyota Plan sandbox through the existing backend
service flow. It does not modify the local catalog, credentials, environment variables, or
production configuration.

## Results

| modelId | planId | amount | slug | status | code | linkHost | durationMs | detail |
|---|---|---:|---|---|---|---|---:|---|
${renderRows(results)}

## Security Notes

- Full generated links are not stored.
- Tokens, Authorization headers, Bearer values, client_id and client_secret are not stored.
- Only linkHost is kept for successful responses.
`;

const run = async (): Promise<void> => {
  ensureSandboxExecution();

  const csv = await fetchSheetCsv();
  const sheetRows = parseSheetCatalogRows(csv);
  const results: SheetSmokeResult[] = [];

  console.log(
    JSON.stringify({
      message: "Starting sheet sandbox smoke validation",
      environment: env.TOYOTA_PLAN_ENV,
      totalRows: sheetRows.length,
      delayMs
    })
  );

  for (const row of sheetRows) {
    const result = await runSmokeForRow(row);
    results.push(result);
    console.log(JSON.stringify(result));
    await sleep(delayMs);
  }

  const summary = buildSummary(results);
  const markdown = renderMarkdown(new Date().toISOString(), results, summary);
  const outputPath = resolve(process.cwd(), OUTPUT_FILE);

  await writeFile(outputPath, markdown, "utf8");

  console.log(
    JSON.stringify({
      message: "Sheet sandbox smoke validation finished",
      ...summary,
      outputFile: OUTPUT_FILE
    })
  );
};

void run().catch((error) => {
  const classified = classifyError(error);
  console.error(
    JSON.stringify({
      message: "Sheet sandbox smoke validation aborted",
      code: classified.code,
      error: classified.detail
    })
  );
  process.exitCode = 1;
});
