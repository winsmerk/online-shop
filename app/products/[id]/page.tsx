import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { promises as fs } from "node:fs";
import path from "node:path";
import { Workbench } from "@/components/workbench";
import { productDir, readJob, readProduct } from "@/lib/storage";
import { conceptsResponseSchema } from "@/schemas";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = await Promise.all([readProduct(id), readJob(id)]).catch(() => null);
  if (!payload) notFound();
  const [product, job] = payload;
  const concepts = await fs.readFile(path.join(productDir(id), "concepts", "response.json"), "utf8").then((raw) => conceptsResponseSchema.parse(JSON.parse(raw))).catch(() => null);
  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-black/60 hover:text-coral"><ArrowLeft className="size-4" /> 返回首页</Link>
      <header className="mb-9 flex flex-wrap items-end justify-between gap-5">
        <div><p className="text-sm font-bold uppercase tracking-[0.18em] text-coral">{product.brandName} · {product.category}</p><h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">{product.name}</h1><p className="mt-3 text-black/55">{product.duration} 秒 · {product.platforms.join(" / ")} · {product.language}</p></div>
        <span className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-black/45">ID {product.id.slice(0, 8)}</span>
      </header>
      <Workbench initial={{ product, job, concepts }} />
    </main>
  );
}
