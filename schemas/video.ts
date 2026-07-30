import { z } from "zod";

export const conceptStyleSchema = z.enum(["pain_point", "core_benefit", "usage_scene"]);
export const motionTypeSchema = z.enum([
  "push_in",
  "pull_out",
  "pan_left_to_right",
  "pan_right_to_left",
  "detail_zoom",
  "fade",
]);
export const transitionSchema = z.enum(["cut", "crossfade", "fade"]);
export const assetTypeSchema = z.enum(["product_image", "logo", "text", "animal"]);
export const sceneSpeakerSchema = z.enum(["narrator", "presenter", "animal", "audience"]);
export const animalActionSchema = z.enum(["bounce", "slide_in", "sway", "pulse", "peek"]);

export const sceneSchema = z
  .object({
    id: z.string().min(1),
    startTime: z.number().nonnegative(),
    endTime: z.number().positive(),
    duration: z.number().positive().max(15),
    visualDescription: z.string().min(1).max(1000),
    voiceover: z.string().max(1000),
    subtitle: z.string().max(500),
    imageIndex: z.number().int().nonnegative(),
    motionType: motionTypeSchema,
    textOverlay: z.string().max(200),
    transition: transitionSchema,
    generationPrompt: z.string().min(1).max(1200),
    assetType: assetTypeSchema,
    speaker: sceneSpeakerSchema.optional(),
    characterAction: animalActionSchema.optional(),
    interactionCue: z.string().max(300).optional(),
  })
  .superRefine((scene, ctx) => {
    const expected = scene.endTime - scene.startTime;
    if (Math.abs(expected - scene.duration) > 0.05) {
      ctx.addIssue({ code: "custom", path: ["duration"], message: "duration 必须等于 endTime - startTime" });
    }
  });

export const storyboardSchema = z.object({
  scenes: z.array(sceneSchema).min(3).max(12),
});

export const videoScriptSchema = z.object({
  hook: z.string().min(1),
  voiceoverText: z.string().min(1),
  subtitles: z.array(z.string().min(1)).min(1),
  closing: z.string().min(1),
});

export const videoConceptSchema = z.object({
  id: z.string().min(1),
  style: conceptStyleSchema,
  title: z.string().min(1).max(120),
  creativeDirection: z.string().min(1).max(1000),
  script: videoScriptSchema,
  storyboard: storyboardSchema,
  publishingCopy: z.string().min(1).max(2000),
  hashtags: z.array(z.string().min(1).max(80)).min(3).max(15),
  interaction: z
    .object({
      template: z.enum(["quiz", "dialogue", "challenge"]),
      prompt: z.string().min(1).max(300),
      pauseAt: z.number().nonnegative(),
      choices: z
        .array(
          z.object({
            id: z.enum(["a", "b"]),
            label: z.string().min(1).max(100),
            followupText: z.string().min(1).max(500),
            cta: z.string().min(1).max(200),
          }),
        )
        .length(2),
      selectedChoice: z.enum(["a", "b"]).optional(),
    })
    .optional(),
});

export const conceptsResponseSchema = z.object({
  productSummary: z.string().min(1),
  coreSellingPoints: z.array(z.string().min(1)).min(1).max(8),
  audienceInsight: z.string().min(1),
  concepts: z.array(videoConceptSchema).length(3).superRefine((items, ctx) => {
    const styles = new Set(items.map((item) => item.style));
    if (styles.size !== 3) {
      ctx.addIssue({ code: "custom", message: "三套创意必须分别使用三种不同风格" });
    }
  }),
});

export const subtitleCueSchema = z.object({
  index: z.number().int().positive(),
  startTime: z.number().nonnegative(),
  endTime: z.number().positive(),
  text: z.string().min(1),
});

export const videoOutputSchema = z.object({
  conceptId: z.string().min(1),
  title: z.string().min(1),
  videoPath: z.string().min(1),
  scriptPath: z.string().min(1),
  storyboardPath: z.string().min(1),
  subtitlePath: z.string().min(1),
  duration: z.number().positive(),
  width: z.literal(1080),
  height: z.literal(1920),
  codec: z.literal("h264"),
  presenterPath: z.string().min(1).optional(),
  presenterName: z.string().min(1).optional(),
  createdAt: z.string().datetime(),
});

export type Scene = z.infer<typeof sceneSchema>;
export type Storyboard = z.infer<typeof storyboardSchema>;
export type VideoScript = z.infer<typeof videoScriptSchema>;
export type VideoConcept = z.infer<typeof videoConceptSchema>;
export type ConceptsResponse = z.infer<typeof conceptsResponseSchema>;
export type SubtitleCue = z.infer<typeof subtitleCueSchema>;
export type VideoOutput = z.infer<typeof videoOutputSchema>;
