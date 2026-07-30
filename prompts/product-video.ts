import type { Product } from "@/schemas";

export const PRODUCT_VIDEO_SYSTEM_PROMPT = `你是资深短视频创意总监。你必须只返回符合给定结构的 JSON，不要 Markdown，不要解释。

硬性规则：
- 返回三套创意，style 依次覆盖 pain_point、core_benefit、usage_scene。
- 每套总时长必须与商品指定时长一致，scene 时间连续且 duration=endTime-startTime。
- 三套创意必须在开场、镜头顺序、运镜和字幕表达上明显不同。
- 只使用用户上传的真实商品图片，不重新绘制或改变商品外观。
- generationPrompt 描述如何使用原图构图，不要求生成新商品。
- imageIndex 从 0 开始，可以重复但需改变裁剪、运镜或文字。
- 字幕简短、适合手机安全区域；口播自然，不夸大、不虚构功效。
- motionType 只能是 push_in、pull_out、pan_left_to_right、pan_right_to_left、detail_zoom、fade。
- transition 只能是 cut、crossfade、fade。
- assetType 使用 product_image。
- hashtags 是带 # 的字符串数组。`;

export function buildProductPrompt(product: Product) {
  return `请分析以下商品资料和 ${product.assets.productImages.length} 张图片，生成严格 JSON：
${JSON.stringify(
  {
    product: {
      name: product.name,
      category: product.category,
      description: product.description,
      sellingPoints: product.sellingPoints,
      targetAudience: product.targetAudience,
      price: product.price,
      callToAction: product.callToAction,
      platforms: product.platforms,
      language: product.language,
      duration: product.duration,
      brandName: product.brandName,
      brandColor: product.brandColor,
    },
    requiredRoot: {
      productSummary: "string",
      coreSellingPoints: ["string"],
      audienceInsight: "string",
      concepts: [
        {
          id: "concept-a",
          style: "pain_point | core_benefit | usage_scene",
          title: "string",
          creativeDirection: "string",
          script: { hook: "string", voiceoverText: "string", subtitles: ["string"], closing: "string" },
          storyboard: {
            scenes: [
              {
                id: "string",
                startTime: 0,
                endTime: 4,
                duration: 4,
                visualDescription: "string",
                voiceover: "string",
                subtitle: "string",
                imageIndex: 0,
                motionType: "push_in",
                textOverlay: "string",
                transition: "cut",
                generationPrompt: "string",
                assetType: "product_image"
              }
            ]
          },
          publishingCopy: "string",
          hashtags: ["#string"]
        }
      ]
    }
  },
  null,
  2,
)}`;
}

export const REPAIR_SYSTEM_PROMPT = `你是 JSON 修复器。只返回修复后的完整 JSON，不要 Markdown 或解释。必须按错误信息修复结构，同时保留原始创意内容。`;
