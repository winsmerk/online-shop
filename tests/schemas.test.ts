import { describe, expect, it } from "vitest";
import { conceptsResponseSchema, productInputSchema, sceneSchema } from "@/schemas";

describe("Zod schemas", () => {
  it("validates a product input", () => {
    const result = productInputSchema.safeParse({
      name: "便携咖啡杯",
      category: "家居用品",
      description: "双层隔热设计，适合通勤和户外使用。",
      sellingPoints: ["保温 8 小时", "防漏杯盖"],
      targetAudience: "都市通勤人群",
      price: "¥129",
      callToAction: "立即购买",
      platforms: ["douyin"],
      language: "简体中文",
      duration: 20,
      brandName: "DAYBREW",
      brandColor: "#FF6B4A",
    });
    expect(result.success).toBe(true);
  });

  it("rejects inconsistent scene timing", () => {
    const result = sceneSchema.safeParse({
      id: "scene-1",
      startTime: 0,
      endTime: 4,
      duration: 3,
      visualDescription: "商品正面",
      voiceover: "轻松带走",
      subtitle: "轻松带走",
      imageIndex: 0,
      motionType: "push_in",
      textOverlay: "便携",
      transition: "cut",
      generationPrompt: "Use source product image unchanged",
      assetType: "product_image",
    });
    expect(result.success).toBe(false);
  });

  it("requires exactly three distinct concept styles", () => {
    const base = {
      id: "a",
      style: "pain_point",
      title: "标题",
      creativeDirection: "方向",
      script: { hook: "开场", voiceoverText: "口播", subtitles: ["字幕"], closing: "结尾" },
      storyboard: { scenes: [] },
      publishingCopy: "文案",
      hashtags: ["#a", "#b", "#c"],
    };
    expect(
      conceptsResponseSchema.safeParse({
        productSummary: "总结",
        coreSellingPoints: ["卖点"],
        audienceInsight: "洞察",
        concepts: [base, { ...base, id: "b" }, { ...base, id: "c" }],
      }).success,
    ).toBe(false);
  });
});
