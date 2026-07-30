import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { syncVideoJob, type StoredVideoJob } from "@/lib/video-jobs/service";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { supabase, user } = await requireUser();
    const { data, error } = await supabase
      .from("video_jobs")
      .select("*,products(name,description,selling_points,product_assets(storage_path,sort_order))")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "任务不存在或无权访问" }, { status: 404 });
    const synced = await syncVideoJob(supabase, data as StoredVideoJob);
    const nestedProduct = data.products as unknown as { product_assets?: Array<{ storage_path: string; sort_order: number }> } | null;
    const productAssets = nestedProduct?.product_assets || [];
    const imageUrls = [];
    for (const asset of productAssets.sort((a, b) => a.sort_order - b.sort_order)) {
      const { data: signed } = await supabase.storage.from("product-images").createSignedUrl(asset.storage_path, 300);
      if (signed) imageUrls.push(signed.signedUrl);
    }
    const products = data.products ? { ...(data.products as object), product_assets: undefined } : data.products;
    return NextResponse.json({ job: { ...data, ...synced, products, imageUrls, request_payload: undefined, provider_response: undefined } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "读取任务失败";
    return NextResponse.json({ error: message }, { status: message === "UNAUTHENTICATED" ? 401 : 400 });
  }
}
