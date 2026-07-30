import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncVideoJob, type StoredVideoJob } from "@/lib/video-jobs/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = getEnv().CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Cron认证失败" }, { status: 401 });
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("video_jobs").select("*").in("status", ["submitted", "processing"]).limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const results = [];
  for (const job of data || []) {
    try {
      const updated = await syncVideoJob(supabase, job as StoredVideoJob);
      results.push({ id: job.id, status: updated.status });
    } catch {
      results.push({ id: job.id, status: "sync_failed" });
    }
  }
  return NextResponse.json({ synced: results.length, results });
}
