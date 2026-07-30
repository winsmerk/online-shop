import { describe, expect, it } from "vitest";
import { generatedScriptSchema } from "@/lib/domain/video";
import { MockScriptProvider } from "@/lib/providers/script/mock";

describe("MockScriptProvider", () => {
  it("uses only supplied product facts and stays within duration", async () => {
    const provider = new MockScriptProvider();
    const result = await provider.generateScript({
      productName: "便携水杯",
      description: "一个适合日常通勤使用的便携水杯。",
      sellingPoints: ["便携", "容量刻度清晰"],
      language: "zh-CN",
      durationSeconds: 15,
    });
    expect(generatedScriptSchema.parse(result)).toEqual(result);
    expect(result.script).toContain("便携");
    expect(result.script).toContain("容量刻度清晰");
    expect(result.estimatedDurationSeconds).toBeLessThanOrEqual(15);
  });
});

