import axios, { AxiosRequestConfig } from "axios";

export type HttpHeaders = Record<string, string>;

export interface HttpClient {
  post<TResponse, TBody = unknown>(
    url: string,
    body: TBody,
    config?: Pick<AxiosRequestConfig, "headers" | "timeout">
  ): Promise<TResponse>;
}

export const axiosHttpClient: HttpClient = {
  async post<TResponse, TBody = unknown>(
    url: string,
    body: TBody,
    config?: Pick<AxiosRequestConfig, "headers" | "timeout">
  ): Promise<TResponse> {
    const response = await axios.post<TResponse>(url, body, config);
    return response.data;
  }
};

export const getErrorResponseData = (error: unknown): unknown => {
  if (axios.isAxiosError(error)) {
    return error.response?.data;
  }

  if (error && typeof error === "object" && "response" in error) {
    const response = error.response as { data?: unknown } | undefined;
    return response?.data;
  }

  return undefined;
};

export const getErrorStatusCode = (error: unknown): number | undefined => {
  if (axios.isAxiosError(error)) {
    return error.response?.status;
  }

  if (error && typeof error === "object" && "response" in error) {
    const response = error.response as { status?: number } | undefined;
    return response?.status;
  }

  return undefined;
};

export const getErrorCode = (error: unknown): string | undefined => {
  if (axios.isAxiosError(error)) {
    return error.code;
  }

  if (error && typeof error === "object" && "code" in error) {
    const code = error.code;
    return typeof code === "string" ? code : undefined;
  }

  return undefined;
};

export const isTimeoutError = (error: unknown): boolean => {
  const code = getErrorCode(error);
  return code === "ECONNABORTED" || code === "ETIMEDOUT";
};

export const isRetryableHttpStatus = (statusCode: number | undefined): boolean =>
  statusCode === 502 || statusCode === 503 || statusCode === 504;

export const isTransientNetworkError = (error: unknown): boolean => {
  const statusCode = getErrorStatusCode(error);
  if (isRetryableHttpStatus(statusCode)) {
    return true;
  }

  const code = getErrorCode(error);
  return (
    code === "ECONNRESET" ||
    code === "ENOTFOUND" ||
    code === "ECONNREFUSED" ||
    code === "EAI_AGAIN" ||
    isTimeoutError(error)
  );
};
