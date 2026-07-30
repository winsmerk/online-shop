import { NextResponse } from "next/server";
import { createProductInputSchema } from "@/lib/domain/video";
import { requireUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireUser();
    const input = createProductInputSchema.parse(await request.json());
    const { name, description, sellingPoints } = input;
    const { data, error } = await supabase
      .from("products")
      .insert({ name, description, selling_points: sellingPoints, user_id: user.id })
      .select("id")
      .single();
    if (error) throw error;
    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "创建商品失败";
    return NextResponse.json({ error: message === "UNAUTHENTICATED" ? "请先登录" : message }, { status: message === "UNAUTHENTICATED" ? 401 : 400 });
  }
}
