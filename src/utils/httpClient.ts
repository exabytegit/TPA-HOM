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
