import { promises as fs } from "node:fs";
import path from "node:path";
import OpenAI from "openai";
import sharp from "sharp";
import { conceptsResponseSchema, type ConceptsResponse, type Product, type VideoConcept } from "@/schemas";
import { config } from "@/lib/config";
import { parseAiJson, saveRawResponse, AiOutputValidationError } from "@/lib/ai/parse";
import type { AiProvider } from "@/lib/ai/provider";
import { buildProductPrompt, PRODUCT_VIDEO_SYSTEM_PROMPT, REPAIR_SYSTEM_PROMPT } from "@/prompts/product-video";

export class OpenAiProvider implements AiProvider {
  readonly name = "openai" as const;
  private client: OpenAI;
  private callCount = 0;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("缺少 OPENAI_API_KEY");
    this.client = new OpenAI({ apiKey, timeout: config.openaiTimeoutMs, maxRetries: config.maxRetries });
  }

  private consumeBudget() {
    this.callCount += 1;
    if (this.callCount > config.maxCallsPerJob) {
      throw new Error(`OpenAI 调用次数超过单任务预算上限（${config.maxCallsPerJob}）`);
    }
  }

  private async requestJson(system: string, user: string, images: Array<{ mimeType: string; data: string }> = []) {
    this.consumeBudget();
    const response = await this.client.chat.completions.create({
      model: config.openaiModel,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: [
            { type: "text", text: user },
            ...images.map((image) => ({
              type: "image_url" as const,
              image_url: { url: `data:${image.mimeType};base64,${image.data}`, detail: "low" as const },
            })),
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: config.maxOutputTokens,
      temperature: 0.7,
    });
    return response.choices[0]?.message.content || "";
  }

  async analyzeAndCreateConcepts(product: Product, debugDir: string): Promise<ConceptsResponse> {
    const root = path.dirname(debugDir);
    const images = await Promise.all(
      product.assets.productImages.slice(0, 6).map(async (asset) => {
        const input = await fs.readFile(path.join(root, asset.relativePath));
        const optimized = await sharp(input).rotate().resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
        return { mimeType: "image/jpeg", data: optimized.toString("base64") };
      }),
    );
    const raw = await this.requestJson(PRODUCT_VIDEO_SYSTEM_PROMPT, buildProductPrompt(product), images);
    await saveRawResponse(debugDir, "ai-response-1.json.txt", raw);
    try {
      return parseAiJson(raw, conceptsResponseSchema);
    } catch (error) {
      if (!(error instanceof AiOutputValidationError)) throw error;
      const repaired = await this.requestJson(
        REPAIR_SYSTEM_PROMPT,
        `校验错误：\n${error.issues}\n\n原始 JSON：\n${raw}`,
      );
      await saveRawResponse(debugDir, "ai-response-repair.json.txt", repaired);
      try {
        return parseAiJson(repaired, conceptsResponseSchema);
      } catch (repairError) {
        if (repairError instanceof AiOutputValidationError) {
          throw new Error(`AI 结构化输出修复后仍未通过：${repairError.issues}`);
        }
        throw repairError;
      }
    }
  }

  async generateVoice(concept: VideoConcept, outputPath: string) {
    this.consumeBudget();
    const response = await this.client.audio.speech.create({
      model: config.ttsModel,
      voice: config.ttsVoice as "alloy",
      input: concept.script.voiceoverText,
      response_format: "aac",
    });
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, Buffer.from(await response.arrayBuffer()), { mode: 0o600 });
  }
}
