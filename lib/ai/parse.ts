import { promises as fs } from "node:fs";
import path from "node:path";
import type { ZodType } from "zod";

export class AiOutputValidationError extends Error {
  constructor(
    message: string,
    public readonly issues: string,
  ) {
    super(message);
    this.name = "AiOutputValidationError";
  }
}

export async function saveRawResponse(debugDir: string, name: string, raw: string) {
  await fs.mkdir(debugDir, { recursive: true });
  await fs.writeFile(path.join(debugDir, name), raw, { encoding: "utf8", mode: 0o600 });
}

export function parseAiJson<T>(raw: string, schema: ZodType<T>): T {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch (error) {
    throw new AiOutputValidationError("AI 返回的内容不是有效 JSON", error instanceof Error ? error.message : "JSON parse error");
  }
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new AiOutputValidationError("AI JSON 未通过结构校验", result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("\n"));
  }
  return result.data;
}
