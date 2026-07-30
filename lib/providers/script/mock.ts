import { generateScriptInputSchema, generatedScriptSchema } from "@/lib/domain/video";
import type { ScriptProvider } from "./types";

const ctaByLanguage = {
  "zh-CN": "立即了解更多",
  "en-US": "Discover more today",
  "ja-JP": "今すぐ詳しく見る",
} as const;

export class MockScriptProvider implements ScriptProvider {
  async generateScript(raw: Parameters<ScriptProvider["generateScript"]>[0]) {
    const input = generateScriptInputSchema.parse(raw);
    const points = input.sellingPoints.slice(0, 3);
    const hook = input.language === "zh-CN"
      ? `还在为${input.productName}的选择纠结？`
      : input.language === "ja-JP"
        ? `${input.productName}選びで迷っていませんか？`
        : `Still choosing the right ${input.productName}?`;
    const body = input.language === "zh-CN"
      ? `${hook}${input.productName}，${points.join("、")}。${ctaByLanguage[input.language]}。`
      : input.language === "ja-JP"
        ? `${hook}${input.productName}は、${points.join("、")}。${ctaByLanguage[input.language]}。`
        : `${hook} ${input.productName} offers ${points.join(", ")}. ${ctaByLanguage[input.language]}.`;
    return generatedScriptSchema.parse({
      title: input.language === "zh-CN" ? `${input.productName}，15秒了解亮点` : input.productName,
      hook,
      script: body,
      sellingPoints: points,
      callToAction: ctaByLanguage[input.language],
      estimatedDurationSeconds: Math.min(input.durationSeconds, Math.max(3, Math.ceil(body.length / (input.language === "en-US" ? 12 : 5)))),
    });
  }
}

