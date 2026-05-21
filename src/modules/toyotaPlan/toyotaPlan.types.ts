export interface ToyotaPlanCatalogItem {
  slug: string;
  modelId: string;
  modelDescription: string;
  planId: string;
  planDescription: string;
  amount: number;
  seller: "HOM";
  enabled: boolean;
}

export interface ToyotaPlanTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export interface ToyotaPlanGenerateLinkRequest {
  modelId: string;
  planId: string;
  amount: number;
  seller: "HOM";
}

export interface ToyotaPlanGenerateLinkResponse {
  success: boolean;
  link?: string;
  message?: string;
}

export interface GenerateSubscriptionLinkResult {
  success: true;
  link: string;
  model: string;
  plan: string;
  amount: number;
}

export interface RequestMetadata {
  ip?: string;
  userAgent?: string;
}

export interface ToyotaPlanRuntimeConfig {
  environment: "sandbox" | "production";
  seller: "HOM";
  scope: string;
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
  generateLinkUrl: string;
  expectedLinkHost: string;
  oauthTimeoutMs: number;
  generateLinkTimeoutMs: number;
}
