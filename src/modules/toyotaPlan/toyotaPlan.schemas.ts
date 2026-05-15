import { z } from "zod";

export const generateLinkBodySchema = z.object({
  slug: z.string().trim().min(1, "slug is required")
});

export const catalogItemSchema = z.object({
  slug: z.string().min(1),
  modelId: z.string().min(1),
  modelDescription: z.string().min(1),
  planId: z.string().min(1),
  planDescription: z.string().min(1),
  amount: z.number().positive(),
  seller: z.literal("HOM"),
  enabled: z.boolean()
});

export const catalogSchema = z.array(catalogItemSchema);

export const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().positive(),
  token_type: z.string().min(1)
});

export const generateLinkResponseSchema = z.object({
  success: z.boolean(),
  link: z.string().url().optional(),
  message: z.string().optional()
});

export type GenerateLinkBody = z.infer<typeof generateLinkBodySchema>;
