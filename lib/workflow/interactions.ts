import { conceptsResponseSchema, type ConceptsResponse, type Product, type VideoConcept } from "@/schemas";

const templates = ["quiz", "dialogue", "challenge"] as const;
const actions = ["bounce", "slide_in", "sway", "pulse", "peek"] as const;

export function applyAnimalInteractions(response: ConceptsResponse, product: Product): ConceptsResponse {
  if (!product.animal?.enabled || !product.assets.animal) return response;
  const animal = product.animal;
  const concepts = response.concepts.map((concept, conceptIndex) => {
    const template = animal.interactionTemplate === "auto" ? templates[conceptIndex % templates.length] : animal.interactionTemplate;
    const prompt =
      template === "quiz"
        ? `${animal.name}想问你：你选 A 还是 B？`
        : template === "dialogue"
          ? `主持人和${animal.name}正在争论，谁的选择更适合你？`
          : `和${animal.name}一起完成商品选择挑战`;
    const choices = [
      {
        id: "a" as const,
        label: animal.choiceA,
        followupText: `选择 A：${animal.choiceA}。重点看${product.sellingPoints[0]}`,
        cta: `${product.callToAction}，查看 A 方案`,
      },
      {
        id: "b" as const,
        label: animal.choiceB,
        followupText: `选择 B：${animal.choiceB}。重点看${product.sellingPoints[1] || product.sellingPoints[0]}`,
        cta: `${product.callToAction}，查看 B 方案`,
      },
    ];
    const scenes = concept.storyboard.scenes.map((scene, sceneIndex) => {
      const action =
        animal.motion === "auto"
          ? actions[(conceptIndex + sceneIndex) % actions.length]
          : animal.motion;
      const speaker = sceneIndex === 1 ? "animal" as const : product.presenter?.enabled ? "presenter" as const : "narrator" as const;
      return {
        ...scene,
        speaker,
        characterAction: action,
        interactionCue: sceneIndex === 0 ? prompt : sceneIndex === 1 ? `${animal.name}用${action}动作回应主持人` : undefined,
      };
    });
    const first = scenes[0];
    scenes[0] = {
      ...first,
      voiceover: `${first.voiceover}。${prompt}`,
      subtitle: prompt,
      textOverlay: template === "quiz" ? "A 还是 B？" : template === "dialogue" ? "谁说得更有道理？" : "商品挑战开始",
    };
    return {
      ...concept,
      script: {
        ...concept.script,
        hook: scenes[0].voiceover,
        voiceoverText: scenes.map((scene) => scene.voiceover).filter(Boolean).join("。"),
        subtitles: scenes.map((scene) => scene.subtitle).filter(Boolean),
      },
      storyboard: { scenes },
      interaction: {
        template,
        prompt,
        pauseAt: Math.min(product.duration - 2, Math.max(2, product.duration * 0.55)),
        choices,
      },
    };
  });
  return conceptsResponseSchema.parse({ ...response, concepts });
}

export function applyInteractionChoice(concept: VideoConcept, choiceId: "a" | "b"): VideoConcept {
  const interaction = concept.interaction;
  if (!interaction) throw new Error("该候选没有二选一互动分支");
  const choice = interaction.choices.find((item) => item.id === choiceId);
  if (!choice) throw new Error(`找不到互动选项：${choiceId}`);
  const scenes = [...concept.storyboard.scenes];
  const lastIndex = scenes.length - 1;
  scenes[lastIndex] = {
    ...scenes[lastIndex],
    speaker: "presenter",
    voiceover: `${choice.followupText}。${choice.cta}`,
    subtitle: choice.followupText,
    textOverlay: choice.cta,
    interactionCue: `观众选择 ${choice.id.toUpperCase()}：${choice.label}`,
  };
  return {
    ...concept,
    script: {
      ...concept.script,
      voiceoverText: scenes.map((scene) => scene.voiceover).filter(Boolean).join("。"),
      subtitles: scenes.map((scene) => scene.subtitle).filter(Boolean),
      closing: choice.cta,
    },
    storyboard: { scenes },
    interaction: { ...interaction, selectedChoice: choiceId },
  };
}
