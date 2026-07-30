import path from "node:path";
import { config } from "@/lib/config";

type UploadKind = "image" | "audio";

const rules = {
  image: {
    extensions: new Set([".jpg", ".jpeg", ".png", ".webp"]),
    mimeTypes: new Set(["image/jpeg", "image/png", "image/webp"]),
    maxBytes: config.imageMaxBytes,
  },
  audio: {
    extensions: new Set([".mp3", ".wav"]),
    mimeTypes: new Set(["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/wave"]),
    maxBytes: config.audioMaxBytes,
  },
} as const;

export class UploadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadValidationError";
  }
}

function matchesMagic(bytes: Uint8Array, extension: string) {
  if ([".jpg", ".jpeg"].includes(extension)) return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (extension === ".png") return bytes.slice(0, 8).every((b, i) => b === [137, 80, 78, 71, 13, 10, 26, 10][i]);
  if (extension === ".webp") {
    return new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  }
  if (extension === ".mp3") {
    const id3 = new TextDecoder().decode(bytes.slice(0, 3)) === "ID3";
    const frame = bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
    return id3 || frame;
  }
  if (extension === ".wav") {
    return new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WAVE";
  }
  return false;
}

export async function validateUpload(file: File, kind: UploadKind) {
  const rule = rules[kind];
  const extension = path.extname(file.name).toLowerCase();
  if (!rule.extensions.has(extension as never)) {
    throw new UploadValidationError(`${kind === "image" ? "图片" : "音频"}格式不支持：${extension || "无扩展名"}`);
  }
  if (!rule.mimeTypes.has(file.type as never)) {
    throw new UploadValidationError(`文件类型与要求不符：${file.type || "未知类型"}`);
  }
  if (file.size <= 0 || file.size > rule.maxBytes) {
    throw new UploadValidationError(`文件大小必须在 1B～${rule.maxBytes / 1024 / 1024}MB 之间`);
  }
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (!matchesMagic(header, extension)) {
    throw new UploadValidationError("文件内容与扩展名不匹配");
  }
  return { extension, mimeType: file.type, size: file.size };
}
