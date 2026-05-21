import { getCorrelationId } from "../middlewares/correlationId";

type LogMeta = Record<string, unknown>;

const REDACTED = "[REDACTED]";
const CIRCULAR = "[Circular]";
const MAX_DEPTH = 6;

const sensitiveKeys = new Set([
  "access_token",
  "accesstoken",
  "token",
  "id_token",
  "refresh_token",
  "client_secret",
  "clientsecret",
  "secret",
  "password",
  "authorization",
  "api_key",
  "apikey",
  "bearer"
]);

const isSensitiveKey = (key: string): boolean => sensitiveKeys.has(key.toLowerCase());

const sanitizeString = (value: string): string => value.replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]");

export const sanitizeForLog = (
  value: unknown,
  depth = 0,
  seen: WeakSet<object> = new WeakSet()
): unknown => {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "string") {
    return sanitizeString(value);
  }

  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return value;
  }

  if (typeof value === "symbol" || typeof value === "function") {
    return String(value);
  }

  if (depth >= MAX_DEPTH) {
    return "[MaxDepth]";
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitizeString(value.message)
    };
  }

  if (Array.isArray(value)) {
    if (seen.has(value)) {
      return CIRCULAR;
    }

    seen.add(value);
    return value.map((item) => sanitizeForLog(item, depth + 1, seen));
  }

  if (typeof value === "object") {
    if (seen.has(value)) {
      return CIRCULAR;
    }

    seen.add(value);
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        isSensitiveKey(key) ? REDACTED : sanitizeForLog(item, depth + 1, seen)
      ])
    );
  }

  return String(value);
};

const write = (level: "info" | "warn" | "error", message: string, meta?: LogMeta): void => {
  const sanitizedMeta = sanitizeForLog(meta);
  const correlationId = getCorrelationId();
  const mergedMeta =
    sanitizedMeta && typeof sanitizedMeta === "object" && !Array.isArray(sanitizedMeta)
      ? {
          ...(sanitizedMeta as Record<string, unknown>),
          ...(correlationId ? { correlationId } : {})
        }
      : correlationId
        ? { correlationId }
        : undefined;
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(mergedMeta ? { meta: mergedMeta } : {})
  };

  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
};

export const logger = {
  info: (message: string, meta?: LogMeta) => write("info", message, meta),
  warn: (message: string, meta?: LogMeta) => write("warn", message, meta),
  error: (message: string, meta?: LogMeta) => write("error", message, meta)
};
