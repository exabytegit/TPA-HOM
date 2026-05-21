import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { NextFunction, Request, Response } from "express";

interface CorrelationContext {
  correlationId: string;
}

const correlationStorage = new AsyncLocalStorage<CorrelationContext>();
const CORRELATION_ID_HEADER = "x-correlation-id";

export const correlationIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const incomingCorrelationId = req.get(CORRELATION_ID_HEADER)?.trim();
  const correlationId = incomingCorrelationId || randomUUID();

  res.setHeader(CORRELATION_ID_HEADER, correlationId);
  correlationStorage.run({ correlationId }, () => next());
};

export const getCorrelationId = (): string | undefined =>
  correlationStorage.getStore()?.correlationId;
