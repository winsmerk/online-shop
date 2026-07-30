import type { GenerationJob, JobStatus } from "@/schemas";

const allowed: Record<JobStatus, JobStatus[]> = {
  uploaded: ["analyzing", "scripting", "failed"],
  analyzing: ["scripting", "failed"],
  scripting: ["generating_presenter", "generating_voice", "failed"],
  generating_presenter: ["generating_voice", "composing", "failed"],
  generating_voice: ["composing", "failed"],
  composing: ["validating", "failed"],
  validating: ["completed", "failed"],
  completed: ["analyzing", "scripting", "generating_presenter", "generating_voice", "composing", "failed"],
  failed: ["analyzing", "scripting", "generating_presenter", "generating_voice", "composing", "failed"],
};

export function transitionJob(job: GenerationJob, status: JobStatus, progress: number, message: string): GenerationJob {
  if (job.status !== status && !allowed[job.status].includes(status)) {
    throw new Error(`非法任务状态变化：${job.status} → ${status}`);
  }
  const now = new Date().toISOString();
  return {
    ...job,
    status,
    progress,
    currentMessage: message,
    error: status === "failed" ? job.error : undefined,
    updatedAt: now,
    startedAt: job.startedAt || (status !== "uploaded" ? now : undefined),
    completedAt: status === "completed" ? now : undefined,
  };
}
