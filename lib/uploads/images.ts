import { z } from "zod";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGE_COUNT = 5;
export const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"] as const;

const extensionToMime = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
} as const;

export const uploadMetadataSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(allowedImageTypes),
  size: z.number().int().positive().max(MAX_IMAGE_BYTES),
});

export function validateUploadMetadata(raw: unknown) {
  const value = uploadMetadataSchema.parse(raw);
  const dot = value.name.lastIndexOf(".");
  const extension = (dot >= 0 ? value.name.slice(dot).toLowerCase() : "") as keyof typeof extensionToMime;
  if (!extensionToMime[extension] || extensionToMime[extension] !== value.type) {
    throw new Error("图片扩展名与MIME类型不一致，仅支持 JPG、PNG、WEBP");
  }
  return { ...value, extension };
}

export function createStoragePath(userId: string, productId: string, extension: string) {
  if (!/^[0-9a-f-]{36}$/i.test(userId) || !/^[0-9a-f-]{36}$/i.test(productId)) {
    throw new Error("无效的用户或商品ID");
  }
  if (!Object.keys(extensionToMime).includes(extension)) throw new Error("不支持的图片扩展名");
  return `${userId}/${productId}/${crypto.randomUUID()}${extension}`;
}

export function detectImageMime(bytes: Uint8Array) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes.slice(0, 8).every((value, index) => value === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index])) return "image/png";
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) return "image/webp";
  return null;
}

export function assertImageContents(bytes: Uint8Array, declaredType: string) {
  const detected = detectImageMime(bytes);
  if (!detected || detected !== declaredType) throw new Error("图片内容与声明格式不一致");
  if (bytes.byteLength > MAX_IMAGE_BYTES) throw new Error("单张图片不能超过10MB");
  return detected;
}
