import { NextResponse } from "next/server";
import { z } from "zod";
import { createStoragePath, MAX_IMAGE_COUNT, validateUploadMetadata } from "@/lib/uploads/images";
import { requireUser } from "@/lib/supabase/server";

const requestSchema = z.object({
  productId: z.string().uuid(),
  files: z.array(z.unknown()).min(1).max(MAX_IMAGE_COUNT),
});

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireUser();
    const body = requestSchema.parse(await request.json());
    const files = body.files.map(validateUploadMetadata);
    const { data: product } = await supabase.from("products").select("id,user_id").eq("id", body.productId).eq("user_id", user.id).maybeSingle();
    if (!product) return NextResponse.json({ error: "商品不存在或无权访问" }, { status: 404 });

    const uploads = [];
    for (const file of files) {
      const storagePath = createStoragePath(user.id, body.productId, file.extension);
      const { data, error } = await supabase.storage.from("product-images").createSignedUploadUrl(storagePath);
      if (error) throw error;
      uploads.push({ path: storagePath, token: data.token });
    }
    return NextResponse.json({ uploads });
  } catch (error) {
    const message = error instanceof Error ? error.message : "创建上传地址失败";
    return NextResponse.json({ error: message }, { status: message === "UNAUTHENTICATED" ? 401 : 400 });
  }
}

