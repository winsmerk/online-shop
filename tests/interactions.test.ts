import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { MockAiProvider } from "@/lib/ai/mock-provider";
import { applyAnimalInteractions, applyInteractionChoice } from "@/lib/workflow/interactions";
import type { Product } from "@/schemas";

const now = new Date().toISOString();
const product: Product = {
  id: randomUUID(),
  name: "互动商品",
  category: "测试品类",
  description: "用于测试人物和动物角色互动分镜的完整商品介绍。",
  sellingPoints: ["实用功能", "外观设计", "便于携带"],
  targetAudience: "年轻用户",
  price: "¥99",
  callToAction: "立即了解",
  platforms: ["douyin"],
  language: "简体中文",
  duration: 15,
  brandName: "TEST",
  brandColor: "#FF6B4A",
  animal: {
    enabled: true,
    name: "小狐",
    personality: "活泼好奇",
    motion: "auto",
    interactionTemplate: "auto",
    choiceA: "实用功能",
    choiceB: "外观设计",
  },
  createdAt: now,
  updatedAt: now,
  assets: {
    productImages: [{
      id: randomUUID(),
      kind: "product_image",
      originalName: "product.png",
      storedName: "product.png",
      mimeType: "image/png",
      size: 100,
      relativePath: "assets/product.png",
    }],
    animal: {
      id: randomUUID(),
      kind: "animal",
      originalName: "fox.png",
      storedName: "fox.png",
      mimeType: "image/png",
      size: 100,
      relativePath: "assets/fox.png",
    },
  },
};

describe("character interactions", () => {
  it("adds three interaction templates and all five animal actions", async () => {
    const base = await new MockAiProvider().analyzeAndCreateConcepts(product);
    const result = applyAnimalInteractions(base, product);
    expect(result.concepts.map((item) => item.interaction?.template)).toEqual(["quiz", "dialogue", "challenge"]);
    const actions = new Set(result.concepts.flatMap((item) => item.storyboard.scenes.map((scene) => scene.characterAction)));
    expect(actions).toEqual(new Set(["bounce", "slide_in", "sway", "pulse", "peek"]));
  });

  it("applies a selected preview branch to the closing scene", async () => {
    const base = await new MockAiProvider().analyzeAndCreateConcepts(product);
    const concept = applyAnimalInteractions(base, product).concepts[0];
    const branched = applyInteractionChoice(concept, "b");
    expect(branched.interaction?.selectedChoice).toBe("b");
    expect(branched.script.closing).toContain("B 方案");
    expect(branched.storyboard.scenes.at(-1)?.interactionCue).toContain("选择 B");
  });
});
