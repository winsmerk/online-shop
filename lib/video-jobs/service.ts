import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createVideoProvider } from "@/lib/providers/video";
import { mapProviderStatus } from "./state";

export interface StoredVideoJob {
  id: string;
  user_id: string;
  product_id: string;
  provider: "mock" | "vidnoz";
  provider_job_id: string | null;
  provider_video_id: string | null;
  provider_video_name: string | null;
  status: "draft" | "uploading" | "script_generating" | "ready" | "submitted" | "processing" | "completed" | "failed" | "canceled";
  progress: number;
  retry_count: number;
  idempotency_key: string;
  error_code: string | null;
  error_message: string | null;
  [key: string]: unknown;
}

export async function syncVideoJob(supabase: SupabaseClient, job: StoredVideoJob) {
  if (!job.provider_job_id || !["submitted", "processing"].includes(job.status)) return job;
  const result = await createVideoProvider().getVideoStatus(job.provider_job_id);
  const status = mapProviderStatus(result.status);
  const patch: Record<string, unknown> = {
    status,
    progress: result.progress,
    provider_video_id: result.providerVideoId || job.provider_video_id,
    error_code: result.errorCode || null,
    error_message: result.errorMessage || null,
    last_synced_at: new Date().toISOString(),
    completed_at: status === "completed" ? new Date().toISOString() : null,
  };
  const { error } = await supabase.from("video_jobs").update(patch).eq("id", job.id);
  if (error) throw new Error(error.message);
  return { ...job, ...patch } as StoredVideoJob;
}

export function providerRetryKey(jobId: string, retryCount: number) {
  return `${jobId}:${retryCount}:${randomUUID()}`;
}
