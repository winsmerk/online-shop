import { NextResponse } from "next/server";
import { assertSafeId, readJob } from "@/lib/storage";
import { startWorkflow } from "@/lib/workflow/run";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    assertSafeId(id);
    const body = (await request.json().catch(() => ({}))) as { conceptId?: string; regenerateConcepts?: boolean };
    await readJob(id);
    startWorkflow(id, { conceptId: body.conceptId, regenerateConcepts: body.regenerateConcepts ?? !body.conceptId }).catch(() => {});
    return NextResponse.json({ accepted: true, productId: id }, { status: 202 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "无法启动任务" }, { status: 409 });
  }
}
