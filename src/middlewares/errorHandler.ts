import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/appError";
import { logger } from "../utils/logger";

export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
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
      statusCode: error.statusCode
    });

    res.status(error.statusCode).json({
      success: false,
      message: error.message
    });
    return;
  }

  logger.error("Unhandled error", {
    message: error instanceof Error ? error.message : "Unknown error"
  });

  res.status(500).json({
    success: false,
    message: "Internal server error"
  });
};
