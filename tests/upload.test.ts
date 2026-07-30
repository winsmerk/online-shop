import { describe, expect, it } from "vitest";
import { validateUpload } from "@/lib/validation/upload";

describe("upload validation", () => {
  it("accepts a PNG with matching signature", async () => {
    const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0, 0, 0, 0, 0]);
    const file = new File([bytes], "product.png", { type: "image/png" });
    await expect(validateUpload(file, "image")).resolves.toMatchObject({ extension: ".png" });
  });

  it("rejects path-like executable names", async () => {
    const file = new File([new Uint8Array(16)], "../../attack.js", { type: "text/javascript" });
    await expect(validateUpload(file, "image")).rejects.toThrow("格式不支持");
  });

  it("rejects spoofed image content", async () => {
    const file = new File([new Uint8Array(16)], "fake.jpg", { type: "image/jpeg" });
    await expect(validateUpload(file, "image")).rejects.toThrow("文件内容与扩展名不匹配");
  });
});
