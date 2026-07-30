import { z } from "zod";

export const platformSchema = z.enum(["tiktok", "douyin", "xiaohongshu"]);
export const durationSchema = z.union([z.literal(15), z.literal(20), z.literal(30)]);

export const storedAssetSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["product_image", "logo", "music", "animal"]),
  originalName: z.string().min(1),
  storedName: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().int().nonnegative(),
  relativePath: z.string().min(1),
});

export const presenterSettingsSchema = z.object({
  enabled: z.boolean(),
  provider: z.literal("heygen"),
  avatarId: z.string().trim().min(1).max(200),
  avatarName: z.string().trim().min(1).max(200),
  previewImageUrl: z.string().url().refine((value) => value.startsWith("https://"), "数字人预览必须使用 HTTPS").optional(),
});

export const animalMotionSchema = z.enum(["auto", "bounce", "slide_in", "sway", "pulse", "peek"]);
export const interactionTemplateSchema = z.enum(["auto", "quiz", "dialogue", "challenge"]);

export const animalSettingsSchema = z.object({
  enabled: z.boolean(),
  name: z.string().trim().min(1).max(80),
  personality: z.string().trim().min(1).max(200),
  motion: animalMotionSchema,
  interactionTemplate: interactionTemplateSchema,
  choiceA: z.string().trim().min(1).max(100),
  choiceB: z.string().trim().min(1).max(100),
});

export const productInputSchema = z.object({
  name: z.string().trim().min(1, "请输入商品名称").max(100),
  category: z.string().trim().min(1, "请输入商品类别").max(80),
  description: z.string().trim().min(10, "商品简介至少 10 个字").max(2000),
  sellingPoints: z.array(z.string().trim().min(1).max(200)).min(1, "至少填写一个卖点").max(10),
  targetAudience: z.string().trim().min(2).max(500),
  price: z.string().trim().min(1).max(80),
  callToAction: z.string().trim().min(1).max(200),
  platforms: z.array(platformSchema).min(1),
  language: z.string().trim().min(2).max(50),
  duration: durationSchema,
  brandName: z.string().trim().min(1).max(100),
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "品牌颜色必须是十六进制颜色"),
  presenter: presenterSettingsSchema.optional(),
  animal: animalSettingsSchema.optional(),
});

export const productSchema = productInputSchema.extend({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  assets: z.object({
    productImages: z.array(storedAssetSchema).min(1),
    logo: storedAssetSchema.optional(),
    music: storedAssetSchema.optional(),
    animal: storedAssetSchema.optional(),
  }),
});

export type ProductInput = z.infer<typeof productInputSchema>;
export type Product = z.infer<typeof productSchema>;
export type StoredAsset = z.infer<typeof storedAssetSchema>;
