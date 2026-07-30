import { NextResponse } from "next/server";
import { videoConceptSchema } from "@/schemas";
import { startWorkflow, updateConceptScript } from "@/lib/workflow/run";

export const runtime = "nodejs";

export async function PUT(request: Request, context: { params: Promise<{ id: string; conceptId: string }> }) {
  try {
    const { id, conceptId } = await context.params;
    const concept = videoConceptSchema.parse(await request.json());
    if (concept.id !== conceptId) throw new Error("候选 ID 不一致");
    await updateConceptScript(id, conceptId, concept);
    startWorkflow(id, { conceptId, regenerateConcepts: false }).catch(() => {});
    return NextResponse.json({ accepted: true }, { status: 202 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "脚本保存失败" }, { status: 400 });
  }
}
