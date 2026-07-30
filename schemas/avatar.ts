import { z } from "zod";

export const avatarLookSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  group_id: z.string().optional(),
  preview_image_url: z.string().url().refine((value) => value.startsWith("https://"), "预览图片必须使用 HTTPS"),
  preview_video_url: z.string().url().refine((value) => value.startsWith("https://"), "预览视频必须使用 HTTPS").optional(),
  gender: z.string().optional(),
  tags: z.array(z.string()).default([]),
  default_voice_id: z.string().optional(),
  supported_api_engines: z.array(z.string()).default([]),
  status: z.string().optional(),
});

export const avatarLooksResponseSchema = z.object({
  data: z.array(avatarLookSchema),
  has_more: z.boolean().optional(),
  next_token: z.string().nullable().optional(),
});

export const heygenCreateVideoResponseSchema = z.object({
  data: z.object({
    video_id: z.string().min(1),
    status: z.string().optional(),
    output_format: z.string().optional(),
  }),
});

export const heygenVideoDetailResponseSchema = z.object({
  data: z.object({
    id: z.string().optional(),
    status: z.enum(["pending", "processing", "completed", "failed"]),
    video_url: z.string().url().optional(),
    subtitle_url: z.string().url().optional(),
    duration: z.number().positive().optional(),
    failure_code: z.string().optional(),
    failure_message: z.string().optional(),
  }),
});

export type AvatarLook = z.infer<typeof avatarLookSchema>;
