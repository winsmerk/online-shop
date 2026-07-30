import { randomUUID } from "node:crypto";
import type {
  CreateVideoInput,
  ListVideosInput,
  ListVideosResult,
  VideoDetailResult,
  VideoProvider,
  VideoStatusResult,
} from "./types";

interface MockRecord {
  jobId: string;
  videoId: string;
  title: string;
  createdAt: number;
  durationSeconds: number;
}

const records = new Map<string, MockRecord>();

export function resetMockVideos() {
  records.clear();
}

export class MockVideoProvider implements VideoProvider {
  async createVideo(input: CreateVideoInput) {
    const existing = [...records.values()].find((item) => item.jobId.endsWith(input.idempotencyKey));
    if (existing) return { providerJobId: existing.jobId, providerVideoId: existing.videoId, status: "submitted" as const };
    const createdAt = Date.now();
    const videoId = `mock-video-${randomUUID()}`;
    const jobId = `mock:${createdAt}:${input.idempotencyKey}`;
    records.set(jobId, { jobId, videoId, title: input.title, createdAt, durationSeconds: input.durationSeconds });
    return { providerJobId: jobId, providerVideoId: videoId, status: "submitted" as const };
  }

  async getVideoStatus(providerJobId: string): Promise<VideoStatusResult> {
    const record = records.get(providerJobId) || parseRecord(providerJobId);
    if (!record) return { providerJobId, status: "failed", progress: 0, errorCode: "VIDEO_NOT_FOUND", errorMessage: "模拟视频任务不存在" };
    const elapsed = Date.now() - record.createdAt;
    if (elapsed < 1_500) return { providerJobId, providerVideoId: record.videoId, status: "submitted", progress: 10 };
    if (elapsed < 4_000) return { providerJobId, providerVideoId: record.videoId, status: "processing", progress: Math.min(90, 20 + Math.floor(elapsed / 50)) };
    return { providerJobId, providerVideoId: record.videoId, status: "completed", progress: 100 };
  }

  async listGeneratedVideos(input: ListVideosInput = {}): Promise<ListVideosResult> {
    const limit = Math.min(Math.max(input.limit || 20, 1), 50);
    const all = [...records.values()].sort((a, b) => b.createdAt - a.createdAt);
    const offset = input.cursor ? Number(input.cursor) : 0;
    return {
      items: all.slice(offset, offset + limit).map((item) => ({
        providerVideoId: item.videoId,
        name: item.title,
        status: Date.now() - item.createdAt >= 4_000 ? "completed" : "processing",
        createdAt: new Date(item.createdAt).toISOString(),
      })),
      nextCursor: offset + limit < all.length ? String(offset + limit) : undefined,
    };
  }

  async getVideoDetail(providerVideoId: string): Promise<VideoDetailResult> {
    const record = [...records.values()].find((item) => item.videoId === providerVideoId);
    if (!record && !providerVideoId.startsWith("mock-video-")) {
      return { providerVideoId, name: "不存在的视频", status: "failed" };
    }
    return {
      providerVideoId,
      name: record?.title || "Mock 商品视频",
      status: "completed",
      playbackUrl: "/mock/sample.mp4",
      downloadUrl: "/mock/sample.mp4",
      durationSeconds: record?.durationSeconds || 5,
      expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
    };
  }
}

function parseRecord(providerJobId: string): MockRecord | undefined {
  const match = /^mock:(\d+):([0-9a-f-]{36})$/.exec(providerJobId);
  if (!match) return undefined;
  const record = {
    jobId: providerJobId,
    videoId: `mock-video-${match[2]}`,
    title: "Mock 商品视频",
    createdAt: Number(match[1]),
    durationSeconds: 5,
  };
  records.set(providerJobId, record);
  return record;
}

