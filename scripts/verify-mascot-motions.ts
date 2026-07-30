import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { config } from "../lib/config";
import { runCommand } from "../lib/video/ffmpeg";
import { mascotFilters, type MascotMotion } from "../lib/video/mascot";

async function main() {
  const root = await mkdtemp(path.join(os.tmpdir(), "mascot-motion-"));
  const mascotPath = path.join(root, "mascot.png");
  await sharp(Buffer.from(`<svg width="300" height="300" xmlns="http://www.w3.org/2000/svg"><circle cx="150" cy="150" r="135" fill="#ff6b4a"/><circle cx="105" cy="125" r="18"/><circle cx="195" cy="125" r="18"/></svg>`)).png().toFile(mascotPath);
  const motions: MascotMotion[] = ["bounce", "slide_in", "sway", "pulse", "peek"];
  for (const motion of motions) {
    const output = path.join(root, `${motion}.mp4`);
    const filters = mascotFilters(1, "[0:v]", "[out]", motion, 1);
    await runCommand(
      config.ffmpegPath,
      [
        "-y",
        "-f", "lavfi", "-i", "color=c=#f6f1e8:s=1080x1920:d=1:r=30",
        "-loop", "1", "-i", mascotPath,
        "-filter_complex", `${filters.inputFilter};${filters.overlayFilter}`,
        "-map", "[out]", "-t", "1", "-an",
        "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p",
        output,
      ],
      { timeoutMs: 60_000 },
    );
  }
  process.stdout.write(`Verified ${motions.length} motions in ${root}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
