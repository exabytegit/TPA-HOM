type LogMeta = Record<string, unknown>;

const redact = (meta?: LogMeta): LogMeta | undefined => {
  if (!meta) {
    return undefined;
  }

  const sensitiveKeys = ["accessToken", "token", "clientSecret", "client_secret"];
  return Object.fromEntries(
    Object.entries(meta).map(([key, value]) => [
      key,
      sensitiveKeys.includes(key) ? "[redacted]" : value
    ])
  );
};

const write = (level: "info" | "warn" | "error", message: string, meta?: LogMeta): void => {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(redact(meta) ? { meta: redact(meta) } : {})
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
