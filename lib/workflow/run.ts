import { promises as fs } from "node:fs";
import path from "node:path";
import { createAiProvider } from "@/lib/ai";
import { scenesToAss, scenesToCues, cuesToSrt } from "@/lib/audio/subtitles";
import { config } from "@/lib/config";
import { productDir, readJob, readProduct, writeJob, writeJsonAtomic } from "@/lib/storage";
import { runCommand, runCommandCapture } from "@/lib/video/ffmpeg";
import { HeygenAvatarProvider } from "@/providers/avatar";
import { LocalMotionProvider } from "@/providers/video";
import { conceptsResponseSchema, videoOutputSchema, type ConceptsResponse, type GenerationJob, type VideoConcept, type VideoOutput } from "@/schemas";
import { transitionJob } from "./state";
import { applyAnimalInteractions, applyInteractionChoice } from "./interactions";

const running = new Map<string, Promise<void>>();

export interface WorkflowOptions {
  conceptId?: string;
  regenerateConcepts?: boolean;
}

async function update(job: GenerationJob, status: GenerationJob["status"], progress: number, message: string) {
  const next = transitionJob(job, status, progress, message);
  await writeJob(next);
  return next;
}

async function artifact(job: GenerationJob, stage: GenerationJob["status"], absolutePath: string) {
  const root = productDir(job.productId);
  const relative = path.relative(root, absolutePath).split(path.sep).join("/");
  const next = {
    ...job,
    updatedAt: new Date().toISOString(),
    artifacts: [...job.artifacts.filter((item) => !(item.stage === stage && item.path === relative)), { stage, path: relative, createdAt: new Date().toISOString() }],
  };
  await writeJob(next);
  return next;
}

async function loadConcepts(root: string) {
  const raw = await fs.readFile(path.join(root, "concepts", "response.json"), "utf8");
  return conceptsResponseSchema.parse(JSON.parse(raw));
}

async function validateVideo(outputPath: string, expectedDuration: number) {
  const raw = await runCommandCapture(
    config.ffprobePath,
    ["-v", "error", "-show_entries", "stream=codec_name,width,height:format=duration", "-of", "json", outputPath],
    30_000,
  );
  const probe = JSON.parse(raw) as { streams?: Array<{ codec_name?: string; width?: number; height?: number }>; format?: { duration?: string } };
  const video = probe.streams?.find((stream) => stream.width && stream.height);
  const audio = probe.streams?.find((stream) => stream.codec_name === "aac");
  const duration = Number(probe.format?.duration);
  if (video?.codec_name !== "h264" || video.width !== 1080 || video.height !== 1920) {
    throw new Error(`视频规格验证失败：期望 H.264 1080×1920，实际 ${video?.codec_name} ${video?.width}×${video?.height}`);
  }
  if (!audio) throw new Error("视频规格验证失败：未找到 AAC 音轨");
  if (!Number.isFinite(duration) || Math.abs(duration - expectedDuration) > 0.6) {
    throw new Error(`视频时长验证失败：期望 ${expectedDuration}s，实际 ${duration}s`);
  }
  const stat = await fs.stat(outputPath);
  if (stat.size < 10_000) throw new Error("视频文件异常：输出文件过小");
  if (expectedDuration < 15 || expectedDuration > 30) throw new Error("视频时长超出 15～30 秒限制");
}

async function saveConceptArtifacts(root: string, response: ConceptsResponse) {
  const responsePath = path.join(root, "concepts", "response.json");
  await writeJsonAtomic(responsePath, response);
  await Promise.all(
    response.concepts.flatMap((concept) => [
      writeJsonAtomic(path.join(root, "concepts", `${concept.id}-script.json`), concept.script),
      writeJsonAtomic(path.join(root, "concepts", `${concept.id}-storyboard.json`), concept.storyboard),
    ]),
  );
  return responsePath;
}

async function execute(productId: string, options: WorkflowOptions) {
  let job = await readJob(productId);
  const product = await readProduct(productId);
  const root = productDir(productId);
  const ai = createAiProvider();
  const video = new LocalMotionProvider();
  const avatar = product.presenter?.enabled ? new HeygenAvatarProvider() : null;
  try {
    let response: ConceptsResponse;
    const shouldAnalyze = options.regenerateConcepts !== false || !(await fs.stat(path.join(root, "concepts", "response.json")).catch(() => null));
    if (shouldAnalyze) {
      job = await update(job, "analyzing", 12, "正在分析商品资料和图片");
      response = applyAnimalInteractions(await ai.analyzeAndCreateConcepts(product, path.join(root, "logs")), product);
      const responsePath = await saveConceptArtifacts(root, response);
      job = await artifact(job, "analyzing", responsePath);
    } else {
      response = await loadConcepts(root);
    }

    job = await update(job, "scripting", 30, "三套创意、脚本与分镜已生成");
    const selected = options.conceptId ? response.concepts.filter((item) => item.id === options.conceptId) : response.concepts;
    if (!selected.length) throw new Error(`找不到候选创意：${options.conceptId}`);

    const presenterPaths = new Map<string, string>();
    if (avatar) {
      if (selected.length > config.heygenMaxVideosPerJob) {
        throw new Error(`单任务 HeyGen 数字人视频不能超过 ${config.heygenMaxVideosPerJob} 条`);
      }
      job = await update(job, "generating_presenter", 36, "正在生成口型同步的 HeyGen 公共数字人视频");
      const presenterDir = path.join(root, "scenes", "presenter");
      await fs.mkdir(presenterDir, { recursive: true });
      for (let index = 0; index < selected.length; index++) {
        const concept = selected[index];
        job = await update(
          job,
          "generating_presenter",
          36 + Math.round(((index + 0.2) / selected.length) * 20),
          `正在生成数字人口播 ${index + 1}/${selected.length}：${product.presenter?.avatarName}`,
        );
        const presenterPath = path.join(presenterDir, `${concept.id}.mp4`);
        await avatar.generatePresenter(product, concept, presenterPath, path.join(root, "logs"));
        presenterPaths.set(concept.id, presenterPath);
        job = await artifact(job, "generating_presenter", presenterPath);
      }
    }

    job = await update(job, "generating_voice", avatar ? 57 : 45, avatar ? "正在提取数字人同步原音并生成字幕" : "正在生成配音与字幕");
    for (const concept of selected) {
      const voicePath = path.join(root, "audio", `${concept.id}.m4a`);
      const srtPath = path.join(root, "subtitles", `${concept.id}.srt`);
      const assPath = path.join(root, "subtitles", `${concept.id}.ass`);
      const presenterPath = presenterPaths.get(concept.id);
      if (presenterPath) {
        await runCommand(
          config.ffmpegPath,
          ["-y", "-i", presenterPath, "-vn", "-c:a", "aac", "-b:a", "160k", "-ar", "44100", voicePath],
          { timeoutMs: 60_000 },
        );
      } else {
        await ai.generateVoice(concept, voicePath, product.duration);
      }
      const cues = scenesToCues(concept.storyboard.scenes);
      await fs.writeFile(srtPath, cuesToSrt(cues), "utf8");
      await fs.writeFile(assPath, scenesToAss(concept.storyboard.scenes, product.brandColor, concept.style), "utf8");
      job = await artifact(job, "generating_voice", srtPath);
    }

    job = await update(job, "composing", 58, "正在合成图片运镜、字幕、Logo 与音频");
    const outputs: VideoOutput[] = job.outputs.filter((output) => !selected.some((concept) => concept.id === output.conceptId));
    for (let index = 0; index < selected.length; index++) {
      const concept = selected[index];
      job = await update(job, "composing", 58 + Math.round(((index + 0.2) / selected.length) * 30), `正在合成候选 ${index + 1}/${selected.length}：${concept.title}`);
      const voicePath = path.join(root, "audio", `${concept.id}.m4a`);
      const assPath = path.join(root, "subtitles", `${concept.id}.ass`);
      const presenterPath = presenterPaths.get(concept.id);
      const result = await video.compose(product, concept, root, voicePath, assPath, presenterPath);
      outputs.push(videoOutputSchema.parse({
        conceptId: concept.id,
        title: concept.title,
        videoPath: path.relative(root, result.videoPath).split(path.sep).join("/"),
        scriptPath: `concepts/${concept.id}-script.json`,
        storyboardPath: `concepts/${concept.id}-storyboard.json`,
        subtitlePath: `subtitles/${concept.id}.srt`,
        duration: product.duration,
        width: 1080,
        height: 1920,
        codec: "h264",
        presenterPath: presenterPath ? path.relative(root, presenterPath).split(path.sep).join("/") : undefined,
        presenterName: product.presenter?.enabled ? product.presenter.avatarName : undefined,
        createdAt: new Date().toISOString(),
      }));
      job = { ...job, outputs };
      await writeJob(job);
    }

    job = await update(job, "validating", 94, "正在验证视频输出");
    for (const output of outputs) await validateVideo(path.join(root, output.videoPath), product.duration);
    job = await update(job, "completed", 100, `已完成 ${outputs.length} 个候选视频`);
    await writeJob({ ...job, outputs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知工作流错误";
    const failed: GenerationJob = {
      ...job,
      status: "failed",
      progress: job.progress,
      currentMessage: "生成失败",
      error: [process.env.OPENAI_API_KEY, process.env.HEYGEN_API_KEY]
        .filter((key): key is string => Boolean(key))
        .reduce((safe, key) => safe.split(key).join("[REDACTED]"), message),
      updatedAt: new Date().toISOString(),
    };
    await writeJob(failed);
    await fs.writeFile(path.join(root, "logs", `error-${Date.now()}.log`), failed.error || "unknown", { encoding: "utf8", mode: 0o600 });
    throw error;
  }
}

export function startWorkflow(productId: string, options: WorkflowOptions = {}) {
  if (running.has(productId)) throw new Error("该商品已有生成任务正在运行");
  const promise = execute(productId, options).finally(() => running.delete(productId));
  running.set(productId, promise);
  return promise;
}

export async function updateConceptScript(productId: string, conceptId: string, concept: VideoConcept) {
  const root = productDir(productId);
  const response = await loadConcepts(root);
  const index = response.concepts.findIndex((item) => item.id === conceptId);
  if (index < 0) throw new Error("未找到候选创意");
  response.concepts[index] = concept;
  await saveConceptArtifacts(root, response);
}

export async function selectConceptBranch(productId: string, conceptId: string, choiceId: "a" | "b") {
  const root = productDir(productId);
  const response = await loadConcepts(root);
  const index = response.concepts.findIndex((item) => item.id === conceptId);
  if (index < 0) throw new Error("未找到候选创意");
  response.concepts[index] = applyInteractionChoice(response.concepts[index], choiceId);
  await saveConceptArtifacts(root, response);
}
