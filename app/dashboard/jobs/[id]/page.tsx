import { notFound } from "next/navigation";
import { JobDetailClient } from "@/components/job-detail-client";
import { requireUser } from "@/lib/supabase/server";

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireUser();
  const { data: job } = await supabase
    .from("video_jobs")
    .select("id,status,progress,duration_seconds,aspect_ratio,language,avatar_id,voice_id,script,error_code,error_message,retry_count,products(name,description,selling_points,product_assets(storage_path,sort_order))")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!job) notFound();
  const product = job.products as unknown as { name: string; description: string; selling_points: string[]; product_assets: Array<{ storage_path: string; sort_order: number }> };
  const assets = product.product_assets || [];
  const imageUrls = [];
  for (const asset of assets.sort((a, b) => a.sort_order - b.sort_order)) {
    const { data } = await supabase.storage.from("product-images").createSignedUrl(asset.storage_path, 300);
    if (data) imageUrls.push(data.signedUrl);
  }
  return <JobDetailClient initial={{ ...job, products: { name: product.name, description: product.description, selling_points: product.selling_points }, imageUrls } as never} />;
}
