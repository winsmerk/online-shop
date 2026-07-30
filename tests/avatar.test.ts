import { afterEach, describe, expect, it, vi } from "vitest";
import { avatarLooksResponseSchema, productInputSchema } from "@/schemas";
import { atempoChain, formatHeygenApiError, listPublicAvatarLooks } from "@/providers/avatar/heygen-provider";

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.HEYGEN_API_KEY;
});

describe("HeyGen avatar integration", () => {
  it("validates public avatar responses as external input", () => {
    const result = avatarLooksResponseSchema.safeParse({
      data: [{
        id: "public-look-1",
        name: "Public Presenter",
        preview_image_url: "https://files.heygen.ai/avatar.jpg",
        tags: ["business"],
        supported_api_engines: ["avatar_iv"],
        status: "completed",
      }],
      has_more: false,
      next_token: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unsafe avatar preview URL", () => {
    expect(
      avatarLooksResponseSchema.safeParse({
        data: [{ id: "x", name: "Bad", preview_image_url: "not-a-url" }],
      }).success,
    ).toBe(false);
  });

  it("validates enabled presenter settings on products", () => {
    const result = productInputSchema.safeParse({
      name: "商品",
      category: "品类",
      description: "这是一段满足长度要求的商品介绍。",
      sellingPoints: ["真实卖点"],
      targetAudience: "目标用户",
      price: "¥99",
      callToAction: "立即购买",
      platforms: ["douyin"],
      language: "简体中文",
      duration: 15,
      brandName: "BRAND",
      brandColor: "#FF6B4A",
      presenter: {
        enabled: true,
        provider: "heygen",
        avatarId: "public-look-1",
        avatarName: "Public Presenter",
        previewImageUrl: "https://files.heygen.ai/avatar.jpg",
      },
    });
    expect(result.success).toBe(true);
  });

  it("builds valid chained audio tempo filters for extreme duration ratios", () => {
    expect(atempoChain(4.5)).toBe("atempo=2.000000,atempo=2.000000,atempo=1.125000");
    expect(atempoChain(0.2)).toBe("atempo=0.500000,atempo=0.500000,atempo=0.800000");
  });

  it("turns insufficient-credit responses into a safe actionable message", () => {
    const raw = JSON.stringify({
      error: {
        code: "insufficient_credit",
        message: "Insufficient credits. Purchase credit packs to continue.",
      },
    });
    expect(formatHeygenApiError(402, raw)).toBe(
      "HeyGen API 余额不足：请在 HeyGen Developers → Add balance 充值后重试。API Key 与公共数字人连接均正常。",
    );
  });

  it("loads and validates public looks through the server-only API client", async () => {
    process.env.HEYGEN_API_KEY = "server-only-test-key";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [{
            id: "public-look-1",
            name: "Presenter",
            preview_image_url: "https://files.heygen.ai/presenter.jpg",
            tags: [],
            supported_api_engines: ["avatar_iv"],
            status: "completed",
          }],
          has_more: false,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const looks = await listPublicAvatarLooks();
    expect(looks).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("ownership=public"),
      expect.objectContaining({
        headers: expect.objectContaining({ "x-api-key": "server-only-test-key" }),
      }),
    );
  });
});
