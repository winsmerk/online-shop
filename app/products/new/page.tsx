import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProductForm } from "@/components/product-form";

export default function NewProductPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-black/60 hover:text-coral"><ArrowLeft className="size-4" /> 返回首页</Link>
      <div className="mb-9">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-coral">New project</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">创建商品视频任务</h1>
      </div>
      <ProductForm />
    </main>
  );
}
