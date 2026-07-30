import { promises as fs } from "node:fs";
import path from "node:path";
import { config } from "@/lib/config";
import { buildSceneCommand, runCommand } from "@/lib/video/ffmpeg";
import { renderTextOverlays } from "@/lib/video/text-overlay";
import { mascotFilters, resolveMascotMotion } from "@/lib/video/mascot";
import type { Product, VideoConcept } from "@/schemas";
import type { ComposeResult, VideoProvider } from "./provider";

const transitionDuration = 0.35;

export class LocalMotionProvider implements VideoProvider {
  readonly name = "local-motion";

  async compose(product: Product, concept: VideoConcept, root: string, voicePath: string, assPath: string, presenterPath?: string): Promise<ComposeResult> {
    const scenesDir = path.join(root, "scenes", concept.id);
    await fs.mkdir(scenesDir, { recursive: true });
    const scenePaths: string[] = [];
    for (let index = 0; index < concept.storyboard.scenes.length; index++) {
      const scene = concept.storyboard.scenes[index];
      const asset = product.assets.productImages[scene.imageIndex % product.assets.productImages.length];
      const inputPath = path.join(root, asset.relativePath);
      const outputPath = path.join(scenesDir, `${String(index + 1).padStart(2, "0")}.mp4`);
      const renderDuration = scene.duration + (index < concept.storyboard.scenes.length - 1 ? transitionDuration : 0);
      await runCommand(config.ffmpegPath, buildSceneCommand(inputPath, outputPath, scene.motionType, renderDuration), { timeoutMs: 180_000 });
      scenePaths.push(outputPath);
    }

    const visualPath = path.join(root, "output", `${concept.id}-visual.mp4`);
    const finalPath = path.join(root, "output", `${concept.id}.mp4`);
    const overlayPaths = await renderTextOverlays(concept, product.brandColor, scenesDir);
    await this.composeVisual(scenePaths, overlayPaths, concept, product, assPath, visualPath, presenterPath);
    await this.muxAudio(visualPath, voicePath, product, root, finalPath);
    return { videoPath: finalPath, scenePaths };
  }

  private async composeVisual(
    scenePaths: string[],
    overlayPaths: string[],
    concept: VideoConcept,
    product: Product,
    _assPath: string,
    outputPath: string,
    presenterPath?: string,
  ) {
    const args = ["-y", ...scenePaths.flatMap((scene) => ["-i", scene])];
    let current = "[0:v]";
    const filters: string[] = [];
    let offset = 0;
    for (let index = 1; index < scenePaths.length; index++) {
      offset += concept.storyboard.scenes[index - 1].duration;
      const next = `[x${index}]`;
      filters.push(`${current}[${index}:v]xfade=transition=fade:duration=${transitionDuration}:offset=${offset.toFixed(3)}${next}`);
      current = next;
    }
    let nextInputIndex = scenePaths.length;
    if (presenterPath) {
      const presenterIndex = nextInputIndex++;
      args.push("-i", presenterPath);
      const introDuration = Math.min(3, product.duration * 0.2);
      const outroStart = Math.max(product.duration - introDuration, introDuration);
      filters.push(
        `[${presenterIndex}:v]split=2[presenterFullSource][presenterPipSource]`,
        `[presenterFullSource]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[presenterFull]`,
        `[presenterPipSource]scale=360:640:force_original_aspect_ratio=increase,crop=360:640,pad=384:664:12:12:color=white[presenterPip]`,
        `${current}[presenterFull]overlay=0:0:enable='between(t,0,${introDuration})+between(t,${outroStart},${product.duration})'[withPresenterFull]`,
        `[withPresenterFull][presenterPip]overlay=W-w-42:330:enable='between(t,${introDuration},${outroStart})'[withPresenter]`,
      );
      current = "[withPresenter]";
    }
    if (product.animal?.enabled && product.assets.animal) {
      const mascotIndex = nextInputIndex++;
      args.push("-loop", "1", "-i", path.join(path.dirname(path.dirname(outputPath)), product.assets.animal.relativePath));
      const motion = resolveMascotMotion(product.animal.motion, concept);
      const mascot = mascotFilters(mascotIndex, current, "[withMascot]", motion, product.duration);
      filters.push(mascot.inputFilter, mascot.overlayFilter);
      current = "[withMascot]";
    }
    for (let index = 0; index < overlayPaths.length; index++) {
      args.push("-loop", "1", "-i", overlayPaths[index]);
      const inputIndex = nextInputIndex++;
      const scene = concept.storyboard.scenes[index];
      const prepared = `[overlay${index}]`;
      const decorated = `[text${index}]`;
      filters.push(
        `[${inputIndex}:v]format=rgba,setpts=PTS+${scene.startTime}/TB,fade=t=in:st=${scene.startTime}:d=0.18:alpha=1,fade=t=out:st=${Math.max(scene.endTime - 0.18, scene.startTime)}:d=0.18:alpha=1${prepared}`,
      );
      filters.push(`${current}${prepared}overlay=0:0:enable='between(t,${scene.startTime},${scene.endTime})'${decorated}`);
      current = decorated;
    }
    let decorated = current;
    if (product.assets.logo) {
      const logoIndex = nextInputIndex;
      args.push("-i", path.join(path.dirname(path.dirname(outputPath)), product.assets.logo.relativePath));
      filters.push(`[${logoIndex}:v]scale=180:-1[logo]`);
      filters.push(`${decorated}[logo]overlay=W-w-60:70:format=auto[withlogo]`);
      decorated = "[withlogo]";
    }
    args.push(
      "-filter_complex", filters.join(";"),
      "-map", decorated,
      "-t", String(product.duration),
      "-an", "-r", "30", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
      outputPath,
    );
    await runCommand(config.ffmpegPath, args, { timeoutMs: 240_000 });
  }

  private async muxAudio(visualPath: string, voicePath: string, product: Product, root: string, outputPath: string) {
    const args = ["-y", "-i", visualPath, "-i", voicePath];
    if (product.assets.music) {
      args.push("-stream_loop", "-1", "-i", path.join(root, product.assets.music.relativePath));
      args.push(
        "-filter_complex",
        `[1:a]volume=1.0,apad[voice];[2:a]volume=0.12,afade=t=out:st=${Math.max(product.duration - 1, 0)}:d=1[music];[voice][music]amix=inputs=2:duration=first:dropout_transition=2[a]`,
        "-map", "0:v", "-map", "[a]",
      );
    } else {
      args.push("-filter_complex", "[1:a]apad[a]", "-map", "0:v", "-map", "[a]");
    }
    args.push(
      "-t", String(product.duration), "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-ar", "44100",
      "-movflags", "+faststart", outputPath,
    );
    await runCommand(config.ffmpegPath, args, { timeoutMs: 120_000 });
  }
}
