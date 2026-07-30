import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { config } from "@/lib/config";
import { runCommand, runCommandCapture } from "@/lib/video/ffmpeg";
import {
  avatarLooksResponseSchema,
  heygenCreateVideoResponseSchema,
  heygenVideoDetailResponseSchema,
  type AvatarLook,
  type Product,
  type VideoConcept,
} from "@/schemas";
import type { AvatarProvider, PresenterResult } from "./provider";

const HEYGEN_API = "https://api.heygen.com";
const MAX_DOWNLOAD_BYTES = 250 * 1024 * 1024;

function apiKey() {
  const key = process.env.HEYGEN_API_KEY;
  if (!key) throw new Error("已启用 HeyGen 数字人，但缺少 HEYGEN_API_KEY。请在 .env 中配置并重启服务。");
  return key;
}

export function formatHeygenApiError(status: number, raw: string) {
  let code = "";
  let message = "";
  try {
    const parsed = JSON.parse(raw) as { error?: { code?: unknown; message?: unknown } };
    code = typeof parsed.error?.code === "string" ? parsed.error.code : "";
    message = typeof parsed.error?.message === "string" ? parsed.error.message : "";
  } catch {
    // HeyGen 偶尔可能返回非 JSON 错误页；下面使用经过截断的原始信息。
  }

  if (status === 402 || code === "insufficient_credit") {
    return "HeyGen API 余额不足：请在 HeyGen Developers → Add balance 充值后重试。API Key 与公共数字人连接均正常。";
  }
  if (status === 401 || code === "unauthorized" || code === "invalid_api_key") {
    return "HeyGen API Key 无效或已失效：请在 HeyGen Developers 重新生成密钥，并更新服务器端 HEYGEN_API_KEY。";
  }
  if (status === 429 || code === "rate_limit_exceeded") {
    return "HeyGen API 请求过于频繁：请稍后重试，任务中间产物已经保留。";
  }
  const safeDetail = message || raw.slice(0, 500) || "未知错误";
  return `HeyGen API 请求失败（${status}）：${safeDetail}`;
}

async function heygenFetch(endpoint: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.heygenTimeoutMs);
  try {
    const response = await fetch(`${HEYGEN_API}${endpoint}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "x-api-key": apiKey(),
        ...init.headers,
      },
      cache: "no-store",
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 1000);
      throw new Error(formatHeygenApiError(response.status, detail || response.statusText));
    }
    return response;
  } finally {
    clearTimeout(timer);
  }
}

export async function listPublicAvatarLooks(): Promise<AvatarLook[]> {
  const response = await heygenFetch("/v3/avatars/looks?ownership=public&limit=30");
  const parsed = avatarLooksResponseSchema.parse(await response.json());
  return parsed.data.filter((look) => look.status !== "failed");
}

function assertHeygenDownloadUrl(raw: string) {
  const url = new URL(raw);
  const allowedHost = url.hostname === "heygen.ai" || url.hostname.endsWith(".heygen.ai");
  if (url.protocol !== "https:" || !allowedHost) throw new Error("HeyGen 返回了不受信任的下载地址");
  return url;
}

export function atempoChain(speed: number) {
  const filters: number[] = [];
  let remaining = speed;
  while (remaining > 2) {
    filters.push(2);
    remaining /= 2;
  }
  while (remaining < 0.5) {
    filters.push(0.5);
    remaining /= 0.5;
  }
  filters.push(remaining);
  return filters.map((value) => `atempo=${value.toFixed(6)}`).join(",");
}

async function mediaDuration(filePath: string) {
  const raw = await runCommandCapture(
    config.ffprobePath,
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", filePath],
    30_000,
  );
  const duration = Number(raw.trim());
  if (!Number.isFinite(duration) || duration <= 0) throw new Error("无法读取 HeyGen 数字人视频时长");
  return duration;
}

async function downloadVideo(urlValue: string, outputPath: string) {
  const url = assertHeygenDownloadUrl(urlValue);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.heygenTimeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, redirect: "error" });
    if (!response.ok) throw new Error(`下载 HeyGen 视频失败（${response.status}）`);
    const declaredSize = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredSize) && declaredSize > MAX_DOWNLOAD_BYTES) throw new Error("HeyGen 视频超过 250MB 安全上限");
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 10_000 || buffer.length > MAX_DOWNLOAD_BYTES) throw new Error("HeyGen 视频文件大小异常");
    await fs.writeFile(outputPath, buffer, { mode: 0o600 });
  } finally {
    clearTimeout(timer);
  }
}

export class HeygenAvatarProvider implements AvatarProvider {
  readonly name = "heygen" as const;

  async generatePresenter(
    product: Product,
    concept: VideoConcept,
    outputPath: string,
    debugDir: string,
  ): Promise<PresenterResult> {
    if (!product.presenter?.enabled) throw new Error("商品未启用数字人");
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.mkdir(debugDir, { recursive: true });
    const createResponse = await heygenFetch("/v3/videos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": randomUUID(),
      },
      body: JSON.stringify({
        type: "avatar",
        avatar_id: product.presenter.avatarId,
        title: `${product.name}-${concept.id}`.slice(0, 120),
        resolution: "1080p",
        aspect_ratio: "9:16",
        fit: "cover",
        background: { type: "color", value: product.brandColor },
        output_format: "mp4",
        script: concept.script.voiceoverText,
        voice_settings: {
          speed: 1,
          pitch: 0,
          volume: 1,
          locale: product.language.includes("中文") ? "zh-CN" : undefined,
        },
      }),
    });
    const createdRaw = await createResponse.json();
    await fs.writeFile(path.join(debugDir, `heygen-${concept.id}-create.json`), JSON.stringify(createdRaw, null, 2), { encoding: "utf8", mode: 0o600 });
    const created = heygenCreateVideoResponseSchema.parse(createdRaw);
    const providerJobId = created.data.video_id;

    let videoUrl: string | undefined;
    let detailRaw: unknown;
    for (let poll = 0; poll < config.heygenMaxPolls; poll++) {
      if (poll > 0) await new Promise((resolve) => setTimeout(resolve, config.heygenPollIntervalMs));
      const statusResponse = await heygenFetch(`/v3/videos/${encodeURIComponent(providerJobId)}`);
      detailRaw = await statusResponse.json();
      const detail = heygenVideoDetailResponseSchema.parse(detailRaw);
      if (detail.data.status === "failed") {
        throw new Error(`HeyGen 数字人生成失败：${detail.data.failure_message || detail.data.failure_code || "未知错误"}`);
      }
      if (detail.data.status === "completed") {
        videoUrl = detail.data.video_url;
        break;
      }
    }
    await fs.writeFile(path.join(debugDir, `heygen-${concept.id}-result.json`), JSON.stringify(detailRaw, null, 2), { encoding: "utf8", mode: 0o600 });
    if (!videoUrl) throw new Error(`HeyGen 数字人生成超时（已轮询 ${config.heygenMaxPolls} 次）`);

    const rawPath = outputPath.replace(/\.mp4$/i, "-raw.mp4");
    await downloadVideo(videoUrl, rawPath);
    const sourceDuration = await mediaDuration(rawPath);
    const speed = sourceDuration / product.duration;
    await runCommand(
      config.ffmpegPath,
      [
        "-y", "-i", rawPath,
        "-filter_complex",
        `[0:v]setpts=PTS/${speed.toFixed(8)},fps=30,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,format=yuv420p[v];[0:a]${atempoChain(speed)},apad,atrim=duration=${product.duration}[a]`,
        "-map", "[v]", "-map", "[a]",
        "-t", String(product.duration),
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
        "-c:a", "aac", "-b:a", "160k", "-ar", "44100",
        "-movflags", "+faststart",
        outputPath,
      ],
      { timeoutMs: 240_000 },
    );
    await fs.unlink(rawPath).catch(() => {});
    return { videoPath: outputPath, providerJobId, sourceDuration, targetDuration: product.duration };
  }
}
