import { NextResponse } from "next/server";
import { createJobInputSchema } from "@/lib/domain/video";
import { getEnv } from "@/lib/env";
import { createVideoProvider } from "@/lib/providers/video";
import { requireUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireUser();
    const input = createJobInputSchema.parse(await request.json());

    const { data: existing } = await supabase
      .from("video_jobs")
      .select("id,status")
      .eq("user_id", user.id)
      .eq("idempotency_key", input.idempotencyKey)
      .maybeSingle();
    if (existing) return NextResponse.json({ jobId: existing.id, status: existing.status, duplicate: true });

    const [{ data: product }, { data: assets }, { count: activeCount }, { count: hourlyCount }] = await Promise.all([
      supabase.from("products").select("id,name,user_id").eq("id", input.productId).eq("user_id", user.id).maybeSingle(),
      supabase.from("product_assets").select("storage_path").eq("product_id", input.productId).eq("user_id", user.id).order("sort_order"),
      supabase.from("video_jobs").select("id", { count: "exact", head: true }).eq("user_id", user.id).in("status", ["submitted", "processing"]),
      supabase.from("video_jobs").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", new Date(Date.now() - 60 * 60_000).toISOString()),
    ]);
    if (!product) return NextResponse.json({ error: "商品不存在或无权访问" }, { status: 404 });
    if (!assets || assets.length < 1 || assets.length > 5) return NextResponse.json({ error: "商品必须拥有1～5张已验证图片" }, { status: 400 });
    if ((activeCount || 0) >= 2) return NextResponse.json({ error: "每个用户同时最多生成2条视频", code: "CONCURRENCY_LIMIT" }, { status: 429 });
    if ((hourlyCount || 0) >= 10) return NextResponse.json({ error: "每个用户每小时最多创建10个任务", code: "HOURLY_LIMIT" }, { status: 429 });

    const env = getEnv();
    const providerName = env.VIDEO_PROVIDER;
    const { data: job, error: insertError } = await supabase
      .from("video_jobs")
      .insert({
        user_id: user.id,
        product_id: input.productId,
        provider: providerName,
        status: "ready",
        progress: 0,
        language: input.language,
        aspect_ratio: input.aspectRatio,
        duration_seconds: input.durationSeconds,
        avatar_id: input.avatarId,
        voice_id: input.voiceId,
        script: input.script,
        request_payload: {
          productId: input.productId,
          aspectRatio: input.aspectRatio,
          durationSeconds: input.durationSeconds,
          avatarId: input.avatarId,
          voiceId: input.voiceId,
        },
        idempotency_key: input.idempotencyKey,
      })
      .select("id")
      .single();
    if (insertError) {
      if (insertError.code === "23505") {
        const { data } = await supabase.from("video_jobs").select("id,status").eq("user_id", user.id).eq("idempotency_key", input.idempotencyKey).single();
        if (!data) throw insertError;
        return NextResponse.json({ jobId: data.id, status: data.status, duplicate: true });
      }
      throw insertError;
    }

    const signedUrls = [];
    for (const asset of assets) {
      const { data, error } = await supabase.storage.from("product-images").createSignedUrl(asset.storage_path, 300);
      if (error) throw error;
      signedUrls.push(data.signedUrl);
    }

    try {
      const result = await createVideoProvider().createVideo({
        externalId: job.id,
        idempotencyKey: input.idempotencyKey,
        title: input.script.title || product.name,
        script: input.script.script,
        durationSeconds: input.durationSeconds,
        aspectRatio: input.aspectRatio,
        language: input.language,
        avatarId: input.avatarId,
        voiceId: input.voiceId,
        imageUrls: signedUrls,
      });
      const { error } = await supabase
        .from("video_jobs")
        .update({
          status: result.status,
          progress: 10,
          provider_job_id: result.providerJobId,
          provider_video_id: result.providerVideoId || null,
          provider_created_at: new Date().toISOString(),
          provider_response: { accepted: true, provider: providerName },
          last_synced_at: new Date().toISOString(),
        })
        .eq("id", job.id)
        .eq("user_id", user.id);
      if (error) throw error;
      return NextResponse.json({ jobId: job.id, status: result.status }, { status: 202 });
    } catch (providerError) {
      const message = providerError instanceof Error ? providerError.message : "视频Provider调用失败";
      await supabase.from("video_jobs").update({
        status: "failed",
        error_code: "PROVIDER_CREATE_FAILED",
        error_message: message.slice(0, 1000),
        last_synced_at: new Date().toISOString(),
      }).eq("id", job.id).eq("user_id", user.id);
      throw providerError;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "创建视频任务失败";
    return NextResponse.json({ error: message }, { status: message === "UNAUTHENTICATED" ? 401 : 400 });
  }
}
