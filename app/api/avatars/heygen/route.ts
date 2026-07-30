import { NextResponse } from "next/server";
import { listPublicAvatarLooks } from "@/providers/avatar";

export const runtime = "nodejs";

export async function GET() {
  if (!process.env.HEYGEN_API_KEY) {
    return NextResponse.json({
      configured: false,
      avatars: [],
      message: "请先在 .env 中配置 HEYGEN_API_KEY 并重启服务",
    });
  }
  try {
    const avatars = await listPublicAvatarLooks();
    const defaultId = process.env.HEYGEN_AVATAR_ID;
    if (defaultId) avatars.sort((a, b) => Number(b.id === defaultId) - Number(a.id === defaultId));
    return NextResponse.json({ configured: true, avatars });
  } catch (error) {
    return NextResponse.json(
      { configured: true, avatars: [], error: error instanceof Error ? error.message : "无法读取 HeyGen 公共数字人" },
      { status: 502 },
    );
  }
}
