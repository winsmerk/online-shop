import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { productDir, readJob, readProduct } from "@/lib/storage";
import { conceptsResponseSchema } from "@/schemas";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const [product, job] = await Promise.all([readProduct(id), readJob(id)]);
    const concepts = await fs
      .readFile(path.join(productDir(id), "concepts", "response.json"), "utf8")
      .then((raw) => conceptsResponseSchema.parse(JSON.parse(raw)))
      .catch(() => null);
    return NextResponse.json({ product, job, concepts });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "任务不存在" }, { status: 404 });
  }
}
