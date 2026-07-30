import { NextResponse } from "next/server";
import { createVideoProvider } from "@/lib/providers/video";
import { requireUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { supabase, user } = await requireUser();
    const { data: job } = await supabase
      .from("video_jobs")
      .select("provider_video_id,status")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!job) return NextResponse.json({ error: "任务不存在或无权访问" }, { status: 404 });
    if (job.status !== "completed" || !job.provider_video_id) {
      return NextResponse.json({ error: "视频尚未完成", code: "VIDEO_NOT_READY" }, { status: 409 });
    }
    const detail = await createVideoProvider().getVideoDetail?.(job.provider_video_id);
    if (!detail || detail.status === "failed" || !detail.playbackUrl) {
      return NextResponse.json({ error: "Vidnoz源视频不存在或已删除", code: "VIDEO_SOURCE_MISSING" }, { status: 410 });
    }
    return NextResponse.json({
      playbackUrl: detail.playbackUrl,
      downloadUrl: detail.downloadUrl || detail.playbackUrl,
      expiresAt: detail.expiresAt,
      durationSeconds: detail.durationSeconds,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取视频地址失败";
    return NextResponse.json({ error: message }, { status: message === "UNAUTHENTICATED" ? 401 : 400 });
  }
}

