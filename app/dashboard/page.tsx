import Link from "next/link";
/* eslint-disable @next/next/no-img-element -- signed private Storage URLs are short-lived and must not be cached by Next Image */
import { ArrowRight, Clock3, PlusCircle, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

const statusText: Record<string, string> = {
  draft: "草稿", uploading: "上传中", script_generating: "生成脚本", ready: "待确认",
  submitted: "已提交", processing: "生成中", completed: "已完成", failed: "失败", canceled: "已取消",
};

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { supabase, user } = await requireUser();
  const query = await searchParams;
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = 10;
  const from = (page - 1) * pageSize;
  const { data: jobs, count } = await supabase
    .from("video_jobs")
    .select("id,status,progress,duration_seconds,provider_video_name,error_message,created_at,products(name,product_assets(storage_path,sort_order))", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  const rows = await Promise.all((jobs || []).map(async (job) => {
    const product = job.products as unknown as { name: string; product_assets: Array<{ storage_path: string; sort_order: number }> } | null;
    const assets = product?.product_assets || [];
    const first = assets.sort((a, b) => a.sort_order - b.sort_order)[0];
    const signed = first ? await supabase.storage.from("product-images").createSignedUrl(first.storage_path, 300) : null;
    return { ...job, thumbnail: signed?.data?.signedUrl };
  }));
  const totalPages = Math.max(1, Math.ceil((count || 0) / pageSize));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div><p className="text-sm font-black uppercase tracking-widest text-coral">Dashboard</p><h1 className="mt-1 text-4xl font-black">我的视频任务</h1><p className="mt-2 text-black/50">只显示当前账号创建的商品和视频。</p></div>
        <Button asChild><Link href="/dashboard/create"><PlusCircle className="size-4" />新建视频</Link></Button>
      </div>
      {rows.length === 0 ? (
        <Card className="mt-8"><CardContent className="grid min-h-72 place-items-center text-center"><div><Video className="mx-auto size-12 text-black/25" /><h2 className="mt-4 text-xl font-black">还没有视频任务</h2><p className="mt-2 text-sm text-black/50">上传商品图片，几分钟完成第一条数字人口播。</p><Button asChild className="mt-5"><Link href="/dashboard/create">开始创建</Link></Button></div></CardContent></Card>
      ) : (
        <div className="mt-8 grid gap-4">
          {rows.map((job) => {
            const product = job.products as unknown as { name: string } | null;
            return (
              <Card key={job.id}>
                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                  <div className="h-24 w-full overflow-hidden rounded-2xl bg-black/5 sm:w-24">
                    {job.thumbnail ? <img src={job.thumbnail} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><Video className="text-black/20" /></div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-lg font-black">{product?.name || "商品视频"}</h2><Badge>{statusText[job.status] || job.status}</Badge></div>
                    <p className="mt-2 flex items-center gap-2 text-sm text-black/50"><Clock3 className="size-4" />{formatDate(job.created_at)} · {job.duration_seconds}秒 · {job.progress}%</p>
                    {job.error_message && <p className="mt-2 line-clamp-1 text-sm text-red-600">{job.error_message}</p>}
                  </div>
                  <Button asChild variant="outline"><Link href={`/dashboard/jobs/${job.id}`}>查看详情<ArrowRight className="size-4" /></Link></Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <div className="mt-6 flex items-center justify-center gap-3 text-sm">
        <Button asChild variant="outline" size="sm"><Link href={`/dashboard?page=${Math.max(1, page - 1)}`}>上一页</Link></Button>
        <span>{page} / {totalPages}</span>
        <Button asChild variant="outline" size="sm"><Link href={`/dashboard?page=${Math.min(totalPages, page + 1)}`}>下一页</Link></Button>
      </div>
    </div>
  );
}
