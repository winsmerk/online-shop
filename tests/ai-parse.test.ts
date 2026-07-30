import { describe, expect, it } from "vitest";
import { z } from "zod";
import { AiOutputValidationError, parseAiJson } from "@/lib/ai/parse";

describe("AI JSON parser", () => {
  const schema = z.object({ title: z.string(), score: z.number().min(0).max(10) });

  it("parses valid structured output", () => {
    expect(parseAiJson('{"title":"ok","score":8}', schema)).toEqual({ title: "ok", score: 8 });
  });

  it("fails clearly on free text", () => {
    expect(() => parseAiJson("Here is your result", schema)).toThrow(AiOutputValidationError);
  });

  it("fails on structurally invalid JSON", () => {
    expect(() => parseAiJson('{"title":"bad","score":100}', schema)).toThrow("结构校验");
  });
});
