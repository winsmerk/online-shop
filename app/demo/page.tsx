import Link from "next/link";
import { redirect } from "next/navigation";
import { listProducts } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function DemoPage() {
  const products = await listProducts();
  if (products[0]) redirect(`/products/${products[0].id}`);
  return (
    <main className="mx-auto grid min-h-screen max-w-xl place-items-center px-6">
      <div className="panel p-8 text-center"><h1 className="text-3xl font-black">还没有演示任务</h1><p className="mt-3 leading-7 text-black/55">运行 <code className="rounded bg-black/5 px-2 py-1">npm run generate:demo</code>，或直接创建自己的商品。</p><Link className="btn-primary mt-6" href="/products/new">创建商品</Link></div>
    </main>
  );
}
