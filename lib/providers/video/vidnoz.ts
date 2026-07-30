import "server-only";
import { z } from "zod";
import { getEnv } from "@/lib/env";
import type { CreateVideoInput, CreateVideoResult, ListVideosInput, ListVideosResult, VideoDetailResult, VideoProvider, VideoStatusResult } from "./types";

const taskResponseSchema = z.object({
  code: z.number(),
  message: z.string().optional(),
  data: z.object({ task_id: z.string().min(1) }).optional(),
});

const taskDetailResponseSchema = z.object({
  code: z.number(),
  message: z.string().optional(),
  data: z.object({
    id: z.union([z.string(), z.number()]).optional(),
    message: z.string().optional(),
    status: z.number(),
    additional_data: z.record(z.unknown()).optional(),
  }).optional(),
});

const videoListResponseSchema = z.object({
  code: z.number(),
  message: z.string().optional(),
  data: z.object({
    end_cursor: z.string().optional(),
    videos: z.array(z.object({
      id: z.string(),
      name: z.string(),
      status: z.number(),
      create_at: z.string(),
      file_720p: z.object({ size: z.number().optional(), duration: z.number().optional(), url: z.string().optional() }).optional(),
      file_1080p: z.object({ size: z.number().optional(), duration: z.number().optional(), url: z.string().optional() }).optional(),
    })),
  }).optional(),
});

const generatedVideoSchema = z.object({
  key: z.string().optional(),
  url: z.string().url().optional(),
  video_size: z.number().optional(),
  video_duration: z.number().optional(),
  video_720p: z.object({
    url: z.string().url().optional(),
    video_size: z.number().optional(),
    video_duration: z.number().optional(),
  }).optional(),
  video_1080p: z.object({
    url: z.string().url().optional(),
    video_size: z.number().optional(),
    video_duration: z.number().optional(),
  }).optional(),
});

export class VidnozProvider implements VideoProvider {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly defaultAvatarId: string;
  private readonly defaultVoiceId: string;
  private readonly timeoutMs = 45_000;

  constructor() {
    const env = getEnv();
    if (!env.VIDNOZ_API_KEY) throw new Error("VIDNOZ_NOT_CONFIGURED：请配置 VIDNOZ_API_KEY。");
    this.baseUrl = env.VIDNOZ_API_BASE_URL.replace(/\/$/, "");
    this.apiKey = env.VIDNOZ_API_KEY;
    this.defaultAvatarId = env.VIDNOZ_DEFAULT_AVATAR_ID;
    this.defaultVoiceId = env.VIDNOZ_DEFAULT_VOICE_ID;
  }

  async createVideo(input: CreateVideoInput): Promise<CreateVideoResult> {
    const form = new FormData();
    form.set("name", input.title);
    form.set("aspect", input.aspectRatio === "9:16" ? "2" : input.aspectRatio === "1:1" ? "3" : "1");
    this.setJson(form, "avatar[id]", input.avatarId.startsWith("mock-") ? this.defaultAvatarId : input.avatarId);
    this.setJson(form, "avatar[style]", "2");
    this.setJson(form, "avatar[scale]", "1.0");
    this.setJson(form, "avatar[offset][x]", "0");
    this.setJson(form, "avatar[offset][y]", "0");
    this.setJson(form, "voice[tts][id]", input.voiceId.startsWith("mock-") ? this.defaultVoiceId : input.voiceId);
    this.setJson(form, "voice[tts][text]", input.script);
    this.setJson(form, "voice[tts][speed]", "1.0");
    this.setJson(form, "voice[tts][pitch]", "0");
    this.setJson(form, "voice[tts][emotion]", "normal");
    this.setJson(form, "background[color]", "#ffffff");
    this.setJson(form, "background[media][url]", input.imageUrls[0] || "");
    this.setJson(form, "background[media][fit]", "1");
    this.setJson(form, "background[media][loop]", "false");

    const response = await this.request("/v2/task/avatar-to-video", { method: "POST", body: form });
    const parsed = taskResponseSchema.parse(response);
    if (parsed.code !== 200 || !parsed.data?.task_id) throw new Error(this.apiError(parsed.code, parsed.message));
    return { providerJobId: parsed.data.task_id, providerVideoId: parsed.data.task_id, status: "submitted", raw: parsed };
  }

  async getVideoStatus(providerJobId: string): Promise<VideoStatusResult> {
    const detail = await this.getTaskDetail(providerJobId);
    const data = detail.data;
    if (!data) return { providerJobId, status: "failed", progress: 0, errorCode: "VIDNOZ_EMPTY_RESPONSE", errorMessage: detail.message };
    const additional = generatedVideoSchema.safeParse(data.additional_data || {}).success
      ? generatedVideoSchema.parse(data.additional_data || {})
      : undefined;
    const url = additional?.video_1080p?.url || additional?.video_720p?.url || additional?.url;
    if (url) return { providerJobId, providerVideoId: providerJobId, status: "completed", progress: 100, raw: detail };
    if (data.status === 3) return { providerJobId, status: "failed", progress: 0, errorCode: "VIDNOZ_RENDER_FAILED", errorMessage: data.message || detail.message, raw: detail };
    return { providerJobId, providerVideoId: providerJobId, status: data.status === 1 ? "completed" : "processing", progress: data.status === 1 ? 100 : 50, raw: detail };
  }

  async listGeneratedVideos(input: ListVideosInput = {}): Promise<ListVideosResult> {
    const query = new URLSearchParams();
    query.set("limit", String(Math.min(Math.max(input.limit || 20, 1), 10_000)));
    if (input.cursor) query.set("end_cursor", input.cursor);
    const response = await this.request(`/v2/video/list?${query.toString()}`, { method: "GET" });
    const parsed = videoListResponseSchema.parse(response);
    if (parsed.code !== 200 || !parsed.data) throw new Error(this.apiError(parsed.code, parsed.message));
    return {
      items: parsed.data.videos.map((video) => ({
        providerVideoId: video.id,
        name: video.name,
        status: video.status === 1 ? "completed" : video.status === 3 ? "failed" : video.status === 2 ? "processing" : "submitted",
        createdAt: video.create_at,
      })),
      nextCursor: parsed.data.end_cursor,
    };
  }

  async getVideoDetail(providerVideoId: string): Promise<VideoDetailResult> {
    const detail = await this.getTaskDetail(providerVideoId);
    const data = detail.data;
    const additional = generatedVideoSchema.safeParse(data?.additional_data || {}).success
      ? generatedVideoSchema.parse(data?.additional_data || {})
      : undefined;
    const file = additional?.video_1080p || additional?.video_720p || additional;
    return {
      providerVideoId,
      name: `Vidnoz video ${providerVideoId}`,
      status: file?.url ? "completed" : data?.status === 3 ? "failed" : "processing",
      playbackUrl: file?.url,
      downloadUrl: file?.url,
      durationSeconds: file?.video_duration || additional?.video_duration,
      fileSize: file?.video_size || additional?.video_size,
      expiresAt: file?.url ? new Date(Date.now() + 7 * 24 * 60 * 60_000).toISOString() : undefined,
    };
  }

  private async getTaskDetail(taskId: string) {
    const form = new FormData();
    form.set("id", taskId);
    const response = await this.request("/v2/task/detail", { method: "POST", body: form });
    const parsed = taskDetailResponseSchema.parse(response);
    if (parsed.code !== 200 || !parsed.data) throw new Error(this.apiError(parsed.code, parsed.message));
    return parsed;
  }

  private setJson(form: FormData, key: string, value: string) {
    form.set(key, new Blob([JSON.stringify(value)], { type: "application/json" }));
  }

  private async request(path: string, init: RequestInit) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${this.apiKey}`, Accept: "application/json", ...(init.headers || {}) },
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    const raw = await response.text();
    let body: unknown;
    try { body = JSON.parse(raw); } catch { throw new Error(`Vidnoz响应不是JSON（HTTP ${response.status}）`); }
    if (!response.ok) throw new Error(`Vidnoz请求失败（HTTP ${response.status}）：${JSON.stringify(body).slice(0, 500)}`);
    return body;
  }

  private apiError(code: number, message?: string) {
    return `Vidnoz API错误（${code}）：${message || "未知错误"}`;
  }
}
