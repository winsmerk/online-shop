import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";

async function main() {
  const output = path.join(process.cwd(), "public", "mock", "sample.mp4");
  await mkdir(path.dirname(output), { recursive: true });
  const args = [
    "-y",
    "-f", "lavfi", "-i", "color=c=0x171512:s=720x1280:r=30:d=5",
    "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=44100:duration=5",
    "-vf", "drawbox=x=80:y=380:w=560:h=520:color=0xff6b4a@0.9:t=fill,drawbox=x=130:y=430:w=460:h=420:color=0xc9f26b@0.9:t=fill",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "veryfast",
    "-c:a", "aac", "-b:a", "96k",
    "-shortest", "-movflags", "+faststart",
    output,
  ];
  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.env.FFMPEG_PATH || "ffmpeg", args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`FFmpeg退出码：${code}`)));
  });
  console.log(`Mock视频已创建：${output}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "创建Mock视频失败");
  process.exitCode = 1;
});
