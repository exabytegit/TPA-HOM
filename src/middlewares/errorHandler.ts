import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { env } from "../config/env";
import { getCorrelationId } from "./correlationId";
import { AppError } from "../utils/appError";
import { logger } from "../utils/logger";

export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const correlationId = getCorrelationId();

  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      ...(correlationId ? { correlationId } : {}),
      message: "Invalid request body",
      issues: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }))
    });
    return;
  }

  if (error instanceof AppError) {
    logger.warn("Operational error", {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      details: error.details
    });

    const payload: Record<string, unknown> = {
      success: false,
      message: error.message,
      code: error.code,
      ...(correlationId ? { correlationId } : {})
    };

    if (env.NODE_ENV !== "production" && error.details) {
      payload.details = error.details;
    }

    res.status(error.statusCode).json(payload);
    return;
  }

  logger.error("Unhandled error", {
    message: error instanceof Error ? error.message : "Unknown error"
  });

  res.status(500).json({
    success: false,
    message: "Internal server error",
    code: "INTERNAL_ERROR",
    ...(correlationId ? { correlationId } : {})
  });
};
