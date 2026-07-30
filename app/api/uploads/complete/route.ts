import { NextResponse } from "next/server";
import { z } from "zod";
import { assertImageContents, MAX_IMAGE_COUNT } from "@/lib/uploads/images";
import { requireUser } from "@/lib/supabase/server";

const requestSchema = z.object({
  productId: z.string().uuid(),
  files: z.array(z.object({
    path: z.string().min(1).max(500),
    type: z.enum(["image/jpeg", "image/png", "image/webp"]),
    size: z.number().int().positive().max(10 * 1024 * 1024),
  })).min(1).max(MAX_IMAGE_COUNT),
});

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireUser();
    const body = requestSchema.parse(await request.json());
    const prefix = `${user.id}/${body.productId}/`;
    const { data: product } = await supabase.from("products").select("id").eq("id", body.productId).eq("user_id", user.id).maybeSingle();
    if (!product) return NextResponse.json({ error: "商品不存在或无权访问" }, { status: 404 });

    const rows = [];
    for (const [index, file] of body.files.entries()) {
      if (!file.path.startsWith(prefix) || file.path.includes("..")) throw new Error("非法Storage路径");
      const { data, error } = await supabase.storage.from("product-images").download(file.path);
      if (error || !data) throw new Error("无法验证已上传的商品图片");
      const bytes = new Uint8Array(await data.arrayBuffer());
      assertImageContents(bytes, file.type);
      if (bytes.byteLength !== file.size) throw new Error("上传后的文件大小与提交值不一致");
      rows.push({
        user_id: user.id,
        product_id: body.productId,
        storage_path: file.path,
        mime_type: file.type,
        file_size: file.size,
        sort_order: index,
      });
    }
    const { error } = await supabase.from("product_assets").insert(rows);
    if (error) throw error;
    return NextResponse.json({ completed: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "验证上传失败";
    return NextResponse.json({ error: message }, { status: message === "UNAUTHENTICATED" ? 401 : 400 });
  }
}

