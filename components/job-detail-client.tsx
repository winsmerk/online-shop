"use client";
/* eslint-disable @next/next/no-img-element -- signed private Storage URLs are intentionally rendered without optimizer caching */

import { AlertTriangle, Download, LoaderCircle, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface JobData {
  id: string;
  status: string;
  progress: number;
  duration_seconds: number;
  aspect_ratio: string;
  language: string;
  avatar_id: string;
  voice_id: string;
  script: { title: string; hook: string; script: string; sellingPoints: string[]; callToAction: string; estimatedDurationSeconds: number };
  error_code?: string | null;
  error_message?: string | null;
  retry_count: number;
  imageUrls?: string[];
  products?: { name: string; description: string; selling_points: string[] };
}

interface MediaData {
  playbackUrl: string;
  downloadUrl: string;
  expiresAt?: string;
}

const statusText: Record<string, string> = {
  draft: "草稿", uploading: "上传中", script_generating: "生成脚本", ready: "待确认",
  submitted: "已提交", processing: "生成中", completed: "已完成", failed: "失败", canceled: "已取消",
};

export function JobDetailClient({ initial }: { initial: JobData }) {
  const [job, setJob] = useState(initial);
  const [media, setMedia] = useState<MediaData>();
  const [error, setError] = useState("");
  const active = ["submitted", "processing"].includes(job.status);

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/video-jobs/${job.id}`, { cache: "no-store" });
    const payload = await response.json() as { job?: JobData; error?: string };
    if (!response.ok || !payload.job) return setError(payload.error || "刷新任务失败");
    setJob(payload.job);
  }, [job.id]);

  const refreshMedia = useCallback(async () => {
    const response = await fetch(`/api/video-jobs/${job.id}/media`, { cache: "no-store" });
    const payload = await response.json() as MediaData & { error?: string };
    if (!response.ok) return setError(payload.error || "获取视频地址失败");
    setMedia(payload);
  }, [job.id]);

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => void refresh(), 1500);
    return () => clearInterval(timer);
  }, [active, refresh]);

  useEffect(() => {
    if (job.status === "completed") void refreshMedia();
  }, [job.status, refreshMedia]);

  async function retry() {
    if (!window.confirm("将重新提交此失败任务。Mock模式不产生费用，确认继续吗？")) return;
    setError("");
    const response = await fetch(`/api/video-jobs/${job.id}/retry`, { method: "POST" });
    const result = await response.json() as { error?: string };
    if (!response.ok) return setError(result.error || "重试失败");
    await refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-sm font-black text-coral">任务状态</p><h1 className="mt-1 text-3xl font-black">{job.products?.name || job.script.title}</h1></div>
              <Badge className={job.status === "failed" ? "bg-red-100 text-red-700" : job.status === "completed" ? "bg-lime/60" : "bg-coral/10 text-coral"}>
                {active && <LoaderCircle className="mr-1 size-3 animate-spin" />}{statusText[job.status] || job.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={job.progress} />
            <p className="mt-2 text-right text-sm font-bold">{job.progress}%</p>
            {job.error_message && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
                <div className="flex gap-2"><AlertTriangle className="mt-0.5 size-4 shrink-0" /><div><strong>生成失败</strong><p>{job.error_message}</p>{job.error_code && <code className="mt-2 block text-xs">{job.error_code}</code>}</div></div>
                <Button className="mt-4" variant="outline" size="sm" onClick={() => void retry()} disabled={job.retry_count >= 3}><RefreshCw className="size-4" />重试（{job.retry_count}/3）</Button>
              </div>
            )}
            {error && <div className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{error}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h2 className="text-xl font-black">商品资料</h2></CardHeader>
          <CardContent>
            <p className="leading-7 text-black/65">{job.products?.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">{(job.products?.selling_points || job.script.sellingPoints).map((point) => <Badge key={point}>{point}</Badge>)}</div>
            <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-5">{job.imageUrls?.map((url) => <img src={url} alt="商品图片" className="aspect-square rounded-xl object-cover" key={url} />)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h2 className="text-xl font-black">已确认口播脚本</h2></CardHeader>
          <CardContent>
            <p className="font-black text-coral">{job.script.hook}</p>
            <p className="mt-3 whitespace-pre-wrap leading-8">{job.script.script}</p>
            <p className="mt-4 text-sm text-black/50">CTA：{job.script.callToAction}</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="overflow-hidden">
          <div className="aspect-[9/16] bg-ink">
            {media?.playbackUrl ? (
              <video className="h-full w-full object-contain" controls playsInline src={media.playbackUrl} />
            ) : (
              <div className="grid h-full place-items-center px-8 text-center text-white/60">
                <div>{active ? <LoaderCircle className="mx-auto size-10 animate-spin text-lime" /> : <VideoPlaceholder />}<p className="mt-4">{job.status === "completed" ? "正在获取最新播放地址…" : "视频完成后将在这里播放"}</p></div>
              </div>
            )}
          </div>
          <CardContent className="pt-5">
            {media?.downloadUrl && <Button asChild className="w-full"><a href={media.downloadUrl} download><Download className="size-4" />下载视频</a></Button>}
            <p className="mt-3 text-center text-xs text-black/40">播放和下载时实时获取Provider有效地址，不永久保存签名URL。</p>
          </CardContent>
        </Card>
        <Card><CardContent className="grid grid-cols-2 gap-4 p-5 text-sm"><Meta label="比例" value={job.aspect_ratio} /><Meta label="时长" value={`${job.duration_seconds}秒`} /><Meta label="语言" value={job.language} /><Meta label="人物 / 声音" value={`${job.avatar_id} / ${job.voice_id}`} /></CardContent></Card>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-black/40">{label}</p><p className="mt-1 font-bold">{value}</p></div>;
}

function VideoPlaceholder() {
  return <div className="mx-auto grid size-14 place-items-center rounded-full border border-white/20">▶</div>;
}
