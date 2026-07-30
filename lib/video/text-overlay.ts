import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { Scene, VideoConcept } from "@/schemas";

const xml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function wrap(text: string, max = 15) {
  const compact = text.replace(/\s+/g, " ").trim();
  const parts: string[] = [];
  for (let index = 0; index < compact.length; index += max) parts.push(compact.slice(index, index + max));
  return parts.slice(0, 3);
}

function lines(text: string, y: number, size: number, lineHeight: number) {
  return wrap(text)
    .map((line, index) => `<tspan x="540" y="${y + index * lineHeight}">${xml(line)}</tspan>`)
    .join("");
}

function sceneSvg(scene: Scene, brandColor: string, style: VideoConcept["style"]) {
  const subtitleY = style === "core_benefit" ? 1490 : style === "usage_scene" ? 1560 : 1530;
  const subtitleFill = style === "core_benefit" ? brandColor : "#FFFFFF";
  const overlayX = style === "usage_scene" ? 76 : 540;
  const overlayAnchor = style === "usage_scene" ? "start" : "middle";
  return `<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
  <rect x="60" y="${subtitleY - 90}" width="960" height="${Math.max(150, wrap(scene.subtitle).length * 76 + 55)}" rx="36" fill="#111111" fill-opacity="0.68"/>
  <text x="540" text-anchor="middle" font-family="PingFang SC,Noto Sans CJK SC,Microsoft YaHei,sans-serif" font-size="60" font-weight="700" fill="${subtitleFill}" stroke="#111111" stroke-width="2" paint-order="stroke" letter-spacing="1">${lines(scene.subtitle, subtitleY, 60, 76)}</text>
  <rect x="${style === "usage_scene" ? 55 : 120}" y="116" width="${style === "usage_scene" ? 720 : 840}" height="180" rx="40" fill="${brandColor}" fill-opacity="0.94"/>
  <text x="${overlayX}" text-anchor="${overlayAnchor}" font-family="PingFang SC,Noto Sans CJK SC,Microsoft YaHei,sans-serif" font-size="70" font-weight="800" fill="#FFFFFF" letter-spacing="1">${lines(scene.textOverlay, 198, 70, 78)}</text>
</svg>`;
}

export async function renderTextOverlays(concept: VideoConcept, brandColor: string, outputDir: string) {
  await fs.mkdir(outputDir, { recursive: true });
  const paths: string[] = [];
  for (let index = 0; index < concept.storyboard.scenes.length; index++) {
    const outputPath = path.join(outputDir, `${String(index + 1).padStart(2, "0")}-text.png`);
    await sharp(Buffer.from(sceneSvg(concept.storyboard.scenes[index], brandColor, concept.style)))
      .png()
      .toFile(outputPath);
    paths.push(outputPath);
  }
  return paths;
}
