export interface AppErrorDetails {
  slug?: string;
  upstreamStatusCode?: number;
  upstreamMessage?: string;
  [key: string]: unknown;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: AppErrorDetails;

  constructor(
    statusCode: number,
    message: string,
    code = "APP_ERROR",
    isOperational = true,
    details?: AppErrorDetails
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;
  }
}
