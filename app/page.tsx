import Link from "next/link";
import { ArrowRight, Clapperboard, FileCheck2, Images, ShieldCheck } from "lucide-react";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-10">
      <nav className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-lg font-black">
          <span className="grid size-10 place-items-center rounded-2xl bg-ink text-lime">
            <Clapperboard className="size-5" />
          </span>
          AI 商品宣传视频
        </div>
        <Link href="/login" className="rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm font-bold">登录</Link>
      </nav>

      <section className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <p className="mb-5 inline-flex rounded-full bg-lime px-4 py-2 text-sm font-bold">15秒内 · 数字人口播 · 异步生成</p>
          <h1 className="max-w-3xl text-5xl font-black leading-[1.05] tracking-[-0.045em] sm:text-7xl">
            让商品图片，
            <span className="text-coral">开口介绍自己。</span>
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-black/65">
            上传1～5张商品图，AI基于真实资料生成短口播。你先编辑确认脚本，再提交数字人视频任务，全程可查看进度、失败原因与历史记录。
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <Link href="/dashboard/create" className="btn-primary gap-2">
              开始生成视频 <ArrowRight className="size-4" />
            </Link>
            <Link href="/login" className="btn-secondary">登录控制台</Link>
          </div>
        </div>

        <div className="panel relative overflow-hidden p-6">
          <div className="absolute -right-12 -top-12 size-40 rounded-full bg-coral/20 blur-2xl" />
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-black/40">Workflow</p>
          <div className="mt-6 space-y-4">
            {[
              [Images, "私有商品素材", "图片仅保存于当前用户的私有空间"],
              [FileCheck2, "脚本先确认", "AI严格使用商品资料，提交前可自由编辑"],
              [ShieldCheck, "任务严格隔离", "每次查询都核验本地用户与视频任务归属"],
            ].map(([Icon, title, body]) => {
              const C = Icon as typeof Images;
              return (
                <div key={String(title)} className="flex gap-4 rounded-2xl bg-cream/80 p-5">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white">
                    <C className="size-5 text-coral" />
                  </span>
                  <div>
                    <h2 className="font-bold">{String(title)}</h2>
                    <p className="mt-1 text-sm leading-6 text-black/55">{String(body)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
