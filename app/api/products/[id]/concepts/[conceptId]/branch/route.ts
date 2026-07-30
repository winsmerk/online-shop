import { NextResponse } from "next/server";
import { z } from "zod";
import { selectConceptBranch, startWorkflow } from "@/lib/workflow/run";

const branchRequestSchema = z.object({ choiceId: z.enum(["a", "b"]) });

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string; conceptId: string }> }) {
  try {
    const { id, conceptId } = await context.params;
    const { choiceId } = branchRequestSchema.parse(await request.json());
    await selectConceptBranch(id, conceptId, choiceId);
    startWorkflow(id, { conceptId, regenerateConcepts: false }).catch(() => {});
    return NextResponse.json({ accepted: true, choiceId }, { status: 202 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "互动分支生成失败" }, { status: 400 });
  }
}
