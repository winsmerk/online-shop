import { describe, expect, it } from "vitest";
import { createJobInputSchema, generateScriptInputSchema, generatedScriptSchema } from "@/lib/domain/video";

describe("new single-video workflow schemas", () => {
  it("accepts a strict 15-second script", () => {
    expect(generatedScriptSchema.parse({
      title: "便携水杯",
      hook: "总是忘记喝水？",
      script: "总是忘记喝水？这款便携水杯容量刻度清晰，带上就走。立即了解更多。",
      sellingPoints: ["便携", "刻度清晰"],
      callToAction: "立即了解更多",
      estimatedDurationSeconds: 14,
    }).estimatedDurationSeconds).toBe(14);
  });

  it("rejects scripts and jobs longer than 15 seconds", () => {
    expect(generatedScriptSchema.safeParse({
      title: "x", hook: "x", script: "x", sellingPoints: ["x"], callToAction: "x", estimatedDurationSeconds: 16,
    }).success).toBe(false);
    expect(generateScriptInputSchema.safeParse({
      productName: "商品", description: "足够长的商品描述文本", sellingPoints: ["卖点"], language: "zh-CN", durationSeconds: 30,
    }).success).toBe(false);
  });

  it("requires a UUID idempotency key", () => {
    expect(createJobInputSchema.safeParse({
      productId: crypto.randomUUID(),
      language: "zh-CN",
      aspectRatio: "9:16",
      durationSeconds: 15,
      avatarId: "avatar",
      voiceId: "voice",
      script: { title: "a", hook: "b", script: "c", sellingPoints: ["d"], callToAction: "e", estimatedDurationSeconds: 5 },
      idempotencyKey: "duplicate",
    }).success).toBe(false);
  });
});

