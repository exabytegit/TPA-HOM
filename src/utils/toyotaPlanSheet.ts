export interface ToyotaPlanSheetRow {
  modelId: string;
  modelDescription: string;
  planId: string;
  planDescription: string;
  amount: number;
}

export const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1F4kUAccg2aS2iGfyYkGXzAhAARy0SErQdlvT3NS-sGo/export?format=csv";

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

export const parseToyotaPlanSheetRows = (csv: string): ToyotaPlanSheetRow[] => {
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

export const fetchToyotaPlanSheetRows = async (): Promise<ToyotaPlanSheetRow[]> => {
  const response = await fetch(SHEET_CSV_URL);

  if (!response.ok) {
    throw new Error(`Failed to fetch Google Sheet CSV: HTTP ${response.status}`);
  }

  return parseToyotaPlanSheetRows(await response.text());
};

export const buildToyotaPlanSheetKey = (modelId: string, planId: string): string =>
  `${modelId.trim()}-${planId.trim()}`;
