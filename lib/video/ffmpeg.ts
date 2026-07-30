import { spawn } from "node:child_process";

export interface RunCommandOptions {
  timeoutMs?: number;
  onStderr?: (line: string) => void;
}

export async function runCommand(command: string, args: string[], options: RunCommandOptions = {}) {
  return await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "ignore", "pipe"], windowsHide: true });
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`命令执行超时（${options.timeoutMs}ms）`));
    }, options.timeoutMs ?? 120_000);
    child.stderr.on("data", (chunk) => {
      const text = String(chunk);
      stderr = (stderr + text).slice(-8000);
      options.onStderr?.(text);
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`${command} 退出码 ${code}：${stderr.slice(-1500)}`));
    });
  });
}

export async function runCommandCapture(command: string, args: string[], timeoutMs = 30_000) {
  return await new Promise<string>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`命令执行超时（${timeoutMs}ms）`));
    }, timeoutMs);
    child.stdout.on("data", (chunk) => (stdout += String(chunk)));
    child.stderr.on("data", (chunk) => (stderr = (stderr + String(chunk)).slice(-4000)));
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout);
      else reject(new Error(`${command} 退出码 ${code}：${stderr.slice(-1000)}`));
    });
  });
}

export function escapeFilterPath(value: string) {
  return value.replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "'\\''");
}

export function motionFilter(motion: string, duration: number) {
  const frames = Math.max(1, Math.ceil(duration * 30));
  const base =
    "split=2[bgsrc][fgsrc];" +
    "[bgsrc]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=32[bg];" +
    "[fgsrc]scale=1000:1760:force_original_aspect_ratio=decrease[fg];" +
    "[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1";
  const zoom: Record<string, string> = {
    push_in: `zoompan=z='min(zoom+0.00011,1.065)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1080x1920:fps=30`,
    pull_out: `zoompan=z='if(eq(on,0),1.065,max(zoom-0.00011,1.0))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1080x1920:fps=30`,
    pan_left_to_right: `zoompan=z='1.055':x='(iw-iw/zoom)*on/${Math.max(frames - 1, 1)}':y='ih/2-(ih/zoom/2)':d=${frames}:s=1080x1920:fps=30`,
    pan_right_to_left: `zoompan=z='1.055':x='(iw-iw/zoom)*(1-on/${Math.max(frames - 1, 1)})':y='ih/2-(ih/zoom/2)':d=${frames}:s=1080x1920:fps=30`,
    detail_zoom: `zoompan=z='min(zoom+0.0002,1.12)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1080x1920:fps=30`,
    fade: `zoompan=z='1.02':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1080x1920:fps=30,fade=t=in:st=0:d=0.35,fade=t=out:st=${Math.max(duration - 0.35, 0)}:d=0.35`,
  };
  return `${base},${zoom[motion] || zoom.push_in},format=yuv420p`;
}

export function buildSceneCommand(inputPath: string, outputPath: string, motion: string, duration: number) {
  return [
    "-y", "-loop", "1", "-i", inputPath,
    "-vf", motionFilter(motion, duration),
    "-t", duration.toFixed(3),
    "-an", "-r", "30", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
    outputPath,
  ];
}
