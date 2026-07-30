import { describe, expect, it } from "vitest";
import { assertImageContents, createStoragePath, detectImageMime, validateUploadMetadata } from "@/lib/uploads/images";

describe("Supabase product image validation", () => {
  it("validates extension, MIME and byte signature", () => {
    expect(validateUploadMetadata({ name: "product.webp", type: "image/webp", size: 100 }).extension).toBe(".webp");
    const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
    expect(detectImageMime(webp)).toBe("image/webp");
    expect(assertImageContents(webp, "image/webp")).toBe("image/webp");
  });

  it("rejects SVG, mismatched MIME and path traversal", () => {
    expect(() => validateUploadMetadata({ name: "x.svg", type: "image/png", size: 10 })).toThrow();
    expect(() => assertImageContents(new Uint8Array([0x4d, 0x5a]), "image/png")).toThrow();
    expect(() => createStoragePath("../user", crypto.randomUUID(), ".png")).toThrow();
  });

  it("generates random owner-scoped storage paths", () => {
    const userId = crypto.randomUUID();
    const productId = crypto.randomUUID();
    const first = createStoragePath(userId, productId, ".jpg");
    const second = createStoragePath(userId, productId, ".jpg");
    expect(first).toMatch(new RegExp(`^${userId}/${productId}/[0-9a-f-]{36}\\.jpg$`));
    expect(first).not.toBe(second);
  });
});

