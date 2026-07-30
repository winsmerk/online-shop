import { z } from "zod";

export const jobStatusSchema = z.enum([
  "draft",
  "uploading",
  "script_generating",
  "ready",
  "submitted",
  "processing",
  "completed",
  "failed",
  "canceled",
]);

export const languageSchema = z.enum(["zh-CN", "en-US", "ja-JP"]);
export const aspectRatioSchema = z.enum(["9:16", "1:1", "16:9"]);
export const durationSchema = z.union([z.literal(5), z.literal(10), z.literal(15)]);

export const generatedScriptSchema = z.object({
  title: z.string().min(1).max(80),
  hook: z.string().min(1).max(100),
  script: z.string().min(1).max(600),
  sellingPoints: z.array(z.string().min(1).max(100)).min(1).max(8),
  callToAction: z.string().min(1).max(100),
  estimatedDurationSeconds: z.number().positive().max(15),
});

export const generateScriptInputSchema = z.object({
  productName: z.string().trim().min(1).max(100),
  description: z.string().trim().min(10).max(2000),
  sellingPoints: z.array(z.string().trim().min(1).max(200)).min(1).max(10),
  language: languageSchema,
  durationSeconds: durationSchema,
});

export const createProductInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().min(10).max(2000),
  sellingPoints: z.array(z.string().trim().min(1).max(200)).min(1).max(10),
});

export const createJobInputSchema = z.object({
  productId: z.string().uuid(),
  language: languageSchema,
  aspectRatio: aspectRatioSchema,
  durationSeconds: durationSchema,
  avatarId: z.string().min(1).max(200),
  voiceId: z.string().min(1).max(200),
  script: generatedScriptSchema,
  idempotencyKey: z.string().uuid(),
});

export type JobStatus = z.infer<typeof jobStatusSchema>;
export type GeneratedScript = z.infer<typeof generatedScriptSchema>;
export type GenerateScriptInput = z.infer<typeof generateScriptInputSchema>;
export type CreateJobInput = z.infer<typeof createJobInputSchema>;

