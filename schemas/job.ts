import { z } from "zod";
import { videoOutputSchema } from "./video";

export const jobStatusSchema = z.enum([
  "uploaded",
  "analyzing",
  "scripting",
  "generating_presenter",
  "generating_voice",
  "composing",
  "validating",
  "completed",
  "failed",
]);

export const stageArtifactSchema = z.object({
  stage: jobStatusSchema,
  path: z.string().min(1),
  createdAt: z.string().datetime(),
});

export const generationJobSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  status: jobStatusSchema,
  progress: z.number().int().min(0).max(100),
  currentMessage: z.string(),
  error: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  provider: z.enum(["openai", "mock"]),
  avatarProvider: z.literal("heygen").optional(),
  artifacts: z.array(stageArtifactSchema),
  outputs: z.array(videoOutputSchema),
});

export type JobStatus = z.infer<typeof jobStatusSchema>;
export type GenerationJob = z.infer<typeof generationJobSchema>;
