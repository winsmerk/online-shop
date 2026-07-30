import { promises as fs } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { config } from "@/lib/config";
import type { AiProvider } from "@/lib/ai/provider";
import type { ConceptsResponse, Product, Scene, VideoConcept } from "@/schemas";

const styles = [
  {
    id: "concept-a",
    style: "pain_point" as const,
    titlePrefix: "别再让",
    direction: "从日常痛点切入，快速建立共鸣，再用商品卖点给出解决方案。",
    motions: ["push_in", "pan_left_to_right", "detail_zoom", "pull_out", "fade"] as const,
  },
  {
    id: "concept-b",
    style: "core_benefit" as const,
    titlePrefix: "一眼看懂",
    direction: "第一秒直给核心卖点，用清晰的证据顺序强化购买理由。",
    motions: ["detail_zoom", "pull_out", "pan_right_to_left", "push_in", "fade"] as const,
  },
  {
    id: "concept-c",
    style: "usage_scene" as const,
    titlePrefix: "今天这样用",
    direction: "把商品放进目标人群的真实一天，以使用场景串联功能和行动号召。",
    motions: ["pan_left_to_right", "fade", "push_in", "detail_zoom", "pull_out"] as const,
  },
] as const;

function buildScenes(product: Product, index: number): Scene[] {
  const count = 5;
  const base = product.duration / count;
  const style = styles[index];
  const pointOrder =
    index === 0
      ? [product.sellingPoints[1], product.sellingPoints[0], product.sellingPoints[2]]
      : index === 1
        ? [product.sellingPoints[0], product.sellingPoints[2], product.sellingPoints[1]]
        : [product.sellingPoints[2], product.sellingPoints[1], product.sellingPoints[0]];
  const fallback = product.sellingPoints[0];
  const subtitles =
    index === 0
      ? [`你是否也遇到这种困扰？`, `${pointOrder[0] || fallback}`, `${product.name}，给出更简单的答案`, `${pointOrder[1] || fallback}`, product.callToAction]
      : index === 1
        ? [`${product.name} 的关键区别`, `${pointOrder[0] || fallback}`, `${pointOrder[1] || fallback}`, `现在 ${product.price}`, product.callToAction]
        : [`属于 ${product.targetAudience} 的一天`, `随时都能用上 ${product.name}`, `${pointOrder[0] || fallback}`, `${pointOrder[1] || fallback}`, product.callToAction];

  return Array.from({ length: count }, (_, sceneIndex) => {
    const startTime = Number((sceneIndex * base).toFixed(3));
    const endTime = sceneIndex === count - 1 ? product.duration : Number(((sceneIndex + 1) * base).toFixed(3));
    const subtitle = subtitles[sceneIndex];
    return {
      id: `${style.id}-scene-${sceneIndex + 1}`,
      startTime,
      endTime,
      duration: Number((endTime - startTime).toFixed(3)),
      visualDescription: `${sceneIndex === 0 ? "强开场构图" : "展示商品真实细节"}，保持商品完整且不改变外观`,
      voiceover: subtitle,
      subtitle,
      imageIndex: (sceneIndex + index) % product.assets.productImages.length,
      motionType: style.motions[sceneIndex],
      textOverlay: sceneIndex === 0 ? style.titlePrefix : subtitle,
      transition: sceneIndex === 0 ? "fade" : index === 1 ? "cut" : "crossfade",
      generationPrompt: `Use uploaded product image ${((sceneIndex + index) % product.assets.productImages.length) + 1} unchanged; preserve exact product shape, label and color; compose for vertical 9:16 with safe text area.`,
      assetType: "product_image",
    };
  });
}

export class MockAiProvider implements AiProvider {
  readonly name = "mock" as const;

  async analyzeAndCreateConcepts(product: Product, debugDir?: string): Promise<ConceptsResponse> {
    void debugDir;
    const concepts = styles.map((style, index) => {
      const scenes = buildScenes(product, index);
      const voiceoverText = scenes.map((scene) => scene.voiceover).join("。");
      return {
        id: style.id,
        style: style.style,
        title: `${style.titlePrefix}｜${product.name}`,
        creativeDirection: style.direction,
        script: {
          hook: scenes[0].voiceover,
          voiceoverText,
          subtitles: scenes.map((scene) => scene.subtitle),
          closing: product.callToAction,
        },
        storyboard: { scenes },
        publishingCopy: `${product.name}：${product.description}\n${product.sellingPoints.join(" · ")}\n${product.price}，${product.callToAction}。`,
        hashtags: [`#${product.name.replace(/\s/g, "")}`, `#${product.category.replace(/\s/g, "")}`, "#好物分享", "#生活方式", `#${product.brandName.replace(/\s/g, "")}`],
      } satisfies VideoConcept;
    });
    return {
      productSummary: `${product.brandName} 的 ${product.name}，面向${product.targetAudience}。`,
      coreSellingPoints: product.sellingPoints.slice(0, 5),
      audienceInsight: `${product.targetAudience}重视清晰、可信、能快速理解的使用价值。`,
      concepts,
    };
  }

  async generateVoice(_concept: VideoConcept, outputPath: string, duration: number) {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    const text = _concept.storyboard.scenes.map((scene) => scene.voiceover).filter(Boolean).join("。");
    const tempSpeech = path.join(path.dirname(outputPath), `${path.basename(outputPath, path.extname(outputPath))}-speech.aiff`);
    let speechCreated = false;

    if (process.platform === "darwin") {
      speechCreated = await runProcess("say", ["-v", "Tingting", "-r", "190", "-o", tempSpeech, text]).then(() => true).catch(() => false);
    } else {
      const wavPath = tempSpeech.replace(/\.aiff$/, ".wav");
      const language = /[\u3400-\u9fff]/.test(text) ? "zh" : "en";
      speechCreated =
        await runProcess("espeak-ng", ["-v", language, "-s", "175", "-w", wavPath, text]).then(() => true).catch(() => false) ||
        await runProcess("espeak", ["-v", language, "-s", "175", "-w", wavPath, text]).then(() => true).catch(() => false);
      if (speechCreated) await fs.rename(wavPath, tempSpeech);
    }

    if (speechCreated) {
      await runProcess(config.ffmpegPath, [
        "-y", "-i", tempSpeech,
        "-af", `loudnorm=I=-16:TP=-1.5:LRA=11,apad,atrim=duration=${duration},afade=t=out:st=${Math.max(duration - 0.25, 0)}:d=0.25`,
        "-c:a", "aac", "-b:a", "160k", "-ar", "44100", outputPath,
      ]);
      await fs.unlink(tempSpeech).catch(() => {});
      return;
    }

    await runProcess(config.ffmpegPath, [
      "-y", "-f", "lavfi", "-i", `sine=frequency=440:sample_rate=44100:duration=${duration}`,
      "-filter:a", `volume=0.16,afade=t=in:st=0:d=0.2,afade=t=out:st=${Math.max(duration - 0.3, 0)}:d=0.3`,
      "-c:a", "aac", "-b:a", "128k", outputPath,
    ]);
  }
}

async function runProcess(command: string, args: string[]) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "ignore", "pipe"], windowsHide: true });
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`${command} 执行超时`));
    }, 60_000);
    child.stderr.on("data", (chunk) => (stderr = (stderr + String(chunk)).slice(-2000)));
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`${command} 退出码 ${code}：${stderr.slice(-500)}`));
    });
  });
}
