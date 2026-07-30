import { NextResponse } from "next/server";
import { generateScriptInputSchema } from "@/lib/domain/video";
import { createScriptProvider } from "@/lib/providers/script";
import { requireUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    await requireUser();
    const input = generateScriptInputSchema.parse(await request.json());
    const script = await createScriptProvider().generateScript(input);
    return NextResponse.json(script);
  } catch (error) {
    const message = error instanceof Error ? error.message : "脚本生成失败";
    return NextResponse.json({ error: message }, { status: message === "UNAUTHENTICATED" ? 401 : 400 });
  }
}
