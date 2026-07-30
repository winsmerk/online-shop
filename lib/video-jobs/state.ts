import type { JobStatus } from "@/lib/domain/video";

const allowed: Record<JobStatus, JobStatus[]> = {
  draft: ["uploading", "script_generating", "ready", "canceled"],
  uploading: ["script_generating", "ready", "failed", "canceled"],
  script_generating: ["ready", "failed", "canceled"],
  ready: ["submitted", "failed", "canceled"],
  submitted: ["processing", "completed", "failed", "canceled"],
  processing: ["completed", "failed", "canceled"],
  completed: [],
  failed: ["submitted", "canceled"],
  canceled: [],
};

export function assertJobTransition(from: JobStatus, to: JobStatus) {
  if (from !== to && !allowed[from].includes(to)) throw new Error(`非法任务状态变化：${from} → ${to}`);
  return to;
}

export function mapProviderStatus(status: "submitted" | "processing" | "completed" | "failed" | "canceled"): JobStatus {
  return status;
}

