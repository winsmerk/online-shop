import { beforeEach, describe, expect, it, vi } from "vitest";
import { MockVideoProvider, resetMockVideos } from "@/lib/providers/video/mock";

const input = {
  externalId: crypto.randomUUID(),
  idempotencyKey: crypto.randomUUID(),
  title: "测试商品",
  script: "一段测试口播。",
  durationSeconds: 5 as const,
  aspectRatio: "9:16" as const,
  language: "zh-CN",
  avatarId: "mock-avatar-1",
  voiceId: "mock-voice-1",
  imageUrls: ["https://example.invalid/signed-image"],
};

describe("MockVideoProvider", () => {
  beforeEach(() => {
    resetMockVideos();
    vi.useRealTimers();
  });

  it("is idempotent for the same key", async () => {
    const provider = new MockVideoProvider();
    const first = await provider.createVideo(input);
    const second = await provider.createVideo(input);
    expect(second.providerJobId).toBe(first.providerJobId);
  });

  it("moves submitted → processing → completed without downloading video", async () => {
    vi.useFakeTimers();
    const provider = new MockVideoProvider();
    const created = await provider.createVideo(input);
    expect((await provider.getVideoStatus(created.providerJobId)).status).toBe("submitted");
    vi.advanceTimersByTime(2_000);
    expect((await provider.getVideoStatus(created.providerJobId)).status).toBe("processing");
    vi.advanceTimersByTime(3_000);
    const completed = await provider.getVideoStatus(created.providerJobId);
    expect(completed.status).toBe("completed");
    expect((await provider.getVideoDetail!(completed.providerVideoId!)).playbackUrl).toBe("/mock/sample.mp4");
  });

  it("supports cursor pagination without exposing it through a user API", async () => {
    const provider = new MockVideoProvider();
    await provider.createVideo(input);
    await provider.createVideo({ ...input, idempotencyKey: crypto.randomUUID() });
    const first = await provider.listGeneratedVideos({ limit: 1 });
    expect(first.items).toHaveLength(1);
    expect(first.nextCursor).toBe("1");
    expect((await provider.listGeneratedVideos({ cursor: first.nextCursor, limit: 1 })).items).toHaveLength(1);
  });
});

