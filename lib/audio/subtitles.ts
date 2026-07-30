import type { Scene, SubtitleCue } from "@/schemas";

export function scenesToCues(scenes: Scene[]): SubtitleCue[] {
  return scenes
    .filter((scene) => scene.subtitle.trim())
    .map((scene, index) => ({
      index: index + 1,
      startTime: scene.startTime,
      endTime: scene.endTime,
      text: scene.subtitle.trim(),
    }));
}

function srtTime(seconds: number) {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  const secs = Math.floor((ms % 60_000) / 1000);
  const millis = ms % 1000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")},${String(millis).padStart(3, "0")}`;
}

function assTime(seconds: number) {
  const cs = Math.max(0, Math.round(seconds * 100));
  const hours = Math.floor(cs / 360_000);
  const minutes = Math.floor((cs % 360_000) / 6_000);
  const secs = Math.floor((cs % 6_000) / 100);
  const centis = cs % 100;
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(centis).padStart(2, "0")}`;
}

export function cuesToSrt(cues: SubtitleCue[]) {
  return cues.map((cue) => `${cue.index}\n${srtTime(cue.startTime)} --> ${srtTime(cue.endTime)}\n${cue.text.replace(/\r?\n/g, " ")}\n`).join("\n");
}

const escapeAss = (text: string) => text.replace(/\\/g, "\\\\").replace(/\{/g, "\\{").replace(/\}/g, "\\}").replace(/\r?\n/g, "\\N");

export function scenesToAss(scenes: Scene[], brandColor: string, style: "pain_point" | "core_benefit" | "usage_scene") {
  const hex = brandColor.replace("#", "");
  const bgr = `&H00${hex.slice(4, 6)}${hex.slice(2, 4)}${hex.slice(0, 2).toUpperCase()}`;
  const subtitleColor = style === "core_benefit" ? bgr : "&H00FFFFFF";
  const alignment = style === "usage_scene" ? 1 : 2;
  const marginV = style === "pain_point" ? 290 : style === "core_benefit" ? 340 : 270;
  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2

[V4+ Styles]
Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding
Style: Subtitle,Arial,62,${subtitleColor},&H000000FF,&HCC111111,&H66000000,-1,0,0,0,100,100,0,0,1,4,1,${alignment},90,90,${marginV},1
Style: Overlay,Arial,72,&H00FFFFFF,&H000000FF,${bgr},&H66000000,-1,0,0,0,100,100,1,0,1,5,1,8,70,70,180,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
  const events = scenes.flatMap((scene) => {
    const subtitle = `Dialogue: 0,${assTime(scene.startTime)},${assTime(scene.endTime)},Subtitle,,0,0,0,,${escapeAss(scene.subtitle)}`;
    const overlayEnd = Math.min(scene.endTime, scene.startTime + Math.min(2.5, scene.duration));
    const overlay = `Dialogue: 1,${assTime(scene.startTime + 0.12)},${assTime(overlayEnd)},Overlay,,0,0,0,,{\\fad(180,180)\\fscx105\\fscy105}${escapeAss(scene.textOverlay)}`;
    return [subtitle, overlay];
  });
  return header + events.join("\n") + "\n";
}
