import "server-only";
import OpenAI from "openai";
import { generateScriptInputSchema, generatedScriptSchema, type GeneratedScript, type GenerateScriptInput } from "@/lib/domain/video";
import { getEnv } from "@/lib/env";
import type { ScriptProvider } from "./types";

const SYSTEM = `你是商品短视频口播编辑。只使用用户提供的事实，不得虚构价格、认证、参数、效果或承诺。
前3秒必须有明确钩子，语言自然，适合数字人口播，总时长不得超过用户要求且绝不超过15秒。
只返回一个JSON对象，字段必须是 title、hook、script、sellingPoints、callToAction、estimatedDurationSeconds。`;

export class OpenAIScriptProvider implements ScriptProvider {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor() {
    const env = getEnv();
    if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY 未配置");
    this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY, timeout: 45_000, maxRetries: 1 });
    this.model = env.OPENAI_MODEL;
  }

  async generateScript(raw: GenerateScriptInput): Promise<GeneratedScript> {
    const input = generateScriptInputSchema.parse(raw);
    const first = await this.request(input, false);
    const parsed = this.parse(first);
    if (parsed.success) return parsed.data;
    const repaired = await this.request(input, true, first);
    const fixed = this.parse(repaired);
    if (!fixed.success) throw new Error(`OpenAI脚本结构验证失败：${fixed.error.issues.map((issue) => issue.message).join("；")}`);
    return fixed.data;
  }

  private parse(value: string) {
    try {
      return generatedScriptSchema.safeParse(JSON.parse(value));
    } catch {
      return generatedScriptSchema.safeParse(null);
    }
  }

  private async request(input: GenerateScriptInput, repair: boolean, invalid = "") {
    const response = await this.client.chat.completions.create({
      model: this.model,
      response_format: { type: "json_object" },
      temperature: repair ? 0 : 0.4,
      max_tokens: 700,
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: repair
            ? `修复下列无效JSON，严格符合要求。原始商品资料：${JSON.stringify(input)}。无效响应：${invalid.slice(0, 4000)}`
            : JSON.stringify(input),
        },
      ],
    });
    return response.choices[0]?.message.content || "";
  }
}

