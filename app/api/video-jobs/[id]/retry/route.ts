import { NextResponse } from "next/server";
import { createVideoProvider } from "@/lib/providers/video";
import { requireUser } from "@/lib/supabase/server";
import { providerRetryKey } from "@/lib/video-jobs/service";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { supabase, user } = await requireUser();
    const { data: job } = await supabase
      .from("video_jobs")
      .select("*,products(name,product_assets(storage_path,sort_order))")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!job) return NextResponse.json({ error: "任务不存在或无权访问" }, { status: 404 });
    if (job.status !== "failed") return NextResponse.json({ error: "只有失败任务可以重试" }, { status: 409 });
    if (job.retry_count >= 3) return NextResponse.json({ error: "该任务已达到最大重试次数" }, { status: 429 });

    const imageUrls = [];
    const product = job.products as unknown as { name: string; product_assets: Array<{ storage_path: string; sort_order: number }> };
    for (const asset of (product.product_assets || []).sort((a, b) => a.sort_order - b.sort_order)) {
      const { data } = await supabase.storage.from("product-images").createSignedUrl(asset.storage_path, 300);
      if (data) imageUrls.push(data.signedUrl);
    }
    const retryCount = job.retry_count + 1;
    const result = await createVideoProvider().createVideo({
      externalId: job.id,
      idempotencyKey: providerRetryKey(job.id, retryCount),
      title: job.script.title || product.name,
      script: job.script.script,
      durationSeconds: job.duration_seconds,
      aspectRatio: job.aspect_ratio,
      language: job.language,
      avatarId: job.avatar_id,
      voiceId: job.voice_id,
      imageUrls,
    });
    const { error } = await supabase.from("video_jobs").update({
      provider_job_id: result.providerJobId,
      provider_video_id: result.providerVideoId || null,
      status: result.status,
      progress: 10,
      retry_count: retryCount,
      error_code: null,
      error_message: null,
      last_synced_at: new Date().toISOString(),
    }).eq("id", job.id).eq("user_id", user.id);
    if (error) throw error;
    return NextResponse.json({ accepted: true, jobId: job.id }, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "重试失败";
    return NextResponse.json({ error: message }, { status: message === "UNAUTHENTICATED" ? 401 : 400 });
  }
}
