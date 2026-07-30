import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { MockAiProvider } from "@/lib/ai/mock-provider";
import { cuesToSrt, scenesToCues } from "@/lib/audio/subtitles";
import type { Product } from "@/schemas";

describe("MockProvider end-to-end artifacts", () => {
  it("generates concepts, mock audio and timed subtitles without an API key", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "product-video-mock-"));
    const product: Product = {
      id: randomUUID(),
      name: "测试商品",
      category: "测试品类",
      description: "这是用于完整 Mock 工作流测试的商品简介。",
      sellingPoints: ["卖点一", "卖点二", "卖点三"],
      targetAudience: "测试用户",
      price: "¥99",
      callToAction: "立即购买",
      platforms: ["douyin"],
      language: "简体中文",
      duration: 15,
      brandName: "TEST",
      brandColor: "#FF6B4A",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assets: {
        productImages: [{
          id: randomUUID(),
          kind: "product_image",
          originalName: "test.jpg",
          storedName: "test.jpg",
          mimeType: "image/jpeg",
          size: 100,
          relativePath: "assets/test.jpg",
        }],
      },
    };
    const provider = new MockAiProvider();
    const response = await provider.analyzeAndCreateConcepts(product, path.join(root, "logs"));
    expect(response.concepts).toHaveLength(3);
    expect(new Set(response.concepts.map((item) => item.style)).size).toBe(3);
    const voice = path.join(root, "voice.m4a");
    await provider.generateVoice(response.concepts[0], voice, 1);
    expect((await readFile(voice)).byteLength).toBeGreaterThan(1000);
    const srt = cuesToSrt(scenesToCues(response.concepts[0].storyboard.scenes));
    expect(srt).toContain("00:00:00,000 -->");
    expect(srt).toContain("立即购买");
  }, 30_000);
});
