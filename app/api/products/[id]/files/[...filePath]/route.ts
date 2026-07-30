import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { productDir } from "@/lib/storage";

export const runtime = "nodejs";

const mimeByExt: Record<string, string> = {
  ".mp4": "video/mp4",
  ".json": "application/json; charset=utf-8",
  ".srt": "application/x-subrip; charset=utf-8",
  ".ass": "text/plain; charset=utf-8",
  ".m4a": "audio/mp4",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function GET(request: Request, context: { params: Promise<{ id: string; filePath: string[] }> }) {
  try {
    const { id, filePath } = await context.params;
    const root = path.resolve(productDir(id));
    const target = path.resolve(root, ...filePath);
    if (!target.startsWith(`${root}${path.sep}`)) throw new Error("非法文件路径");
    const stat = await fs.stat(target);
    if (!stat.isFile()) throw new Error("文件不存在");
    const mime = mimeByExt[path.extname(target).toLowerCase()] || "application/octet-stream";
    const range = request.headers.get("range");
    const download = new URL(request.url).searchParams.get("download") === "1";
    const headers: Record<string, string> = {
      "Content-Type": mime,
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${path.basename(target).replace(/[^a-zA-Z0-9._-]/g, "_")}"`,
    };
    if (range) {
      const match = /^bytes=(\d+)-(\d*)$/.exec(range);
      if (!match) return new NextResponse(null, { status: 416 });
      const start = Number(match[1]);
      const end = match[2] ? Math.min(Number(match[2]), stat.size - 1) : stat.size - 1;
      if (start > end || start >= stat.size) return new NextResponse(null, { status: 416 });
      const handle = await fs.open(target, "r");
      const buffer = Buffer.alloc(end - start + 1);
      await handle.read(buffer, 0, buffer.length, start);
      await handle.close();
      headers["Content-Range"] = `bytes ${start}-${end}/${stat.size}`;
      headers["Content-Length"] = String(buffer.length);
      return new NextResponse(buffer, { status: 206, headers });
    }
    const buffer = await fs.readFile(target);
    headers["Content-Length"] = String(buffer.length);
    return new NextResponse(buffer, { headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "文件不存在" }, { status: 404 });
  }
}
