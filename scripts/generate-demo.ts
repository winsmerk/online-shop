import { randomUUID } from "node:crypto";
import path from "node:path";
import { promises as fs } from "node:fs";
import sharp from "sharp";

process.env.AI_PROVIDER = "mock";

async function main() {
  const [storage, workflow] = await Promise.all([
    import("../lib/storage"),
    import("../lib/workflow/run"),
  ]);
  const productId = randomUUID();
  const root = await storage.ensureProductDirectories(productId);
  const palette = [
    ["#f3e6d4", "#ff6b4a"],
    ["#dcefd7", "#23452f"],
    ["#e5ddf2", "#6042a6"],
  ];
  const assets = [];
  console.log("1/4 正在创建示例商品图片…");
  for (let index = 0; index < palette.length; index++) {
    const storedName = `${randomUUID()}.jpg`;
    const output = path.join(root, "assets", storedName);
    const [background, accent] = palette[index];
    const transform = [
      "translate(0 0) rotate(-7 540 550)",
      "translate(0 0) rotate(0 540 550)",
      "translate(15 10) rotate(8 540 550)",
    ][index];
    const svg = `<svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="bg"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="${background}"/></radialGradient>
        <linearGradient id="cup" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffffff"/><stop offset="0.55" stop-color="${accent}"/><stop offset="1" stop-color="#202020"/></linearGradient>
        <filter id="shadow"><feDropShadow dx="0" dy="28" stdDeviation="28" flood-opacity=".25"/></filter>
      </defs>
      <rect width="1080" height="1080" fill="url(#bg)"/>
      <ellipse cx="540" cy="900" rx="270" ry="58" fill="#111111" opacity=".18"/>
      <g transform="${transform}" filter="url(#shadow)">
        <path d="M360 310 Q540 250 720 310 L685 820 Q675 900 595 915 L485 915 Q405 900 395 820 Z" fill="url(#cup)"/>
        <rect x="345" y="265" width="390" height="105" rx="48" fill="#242424"/>
        <rect x="385" y="288" width="310" height="34" rx="17" fill="#666666"/>
        <path d="M720 430 C895 425 900 690 705 700" fill="none" stroke="#242424" stroke-width="55"/>
        <rect x="430" y="500" width="220" height="150" rx="28" fill="#ffffff" opacity=".92"/>
        <text x="540" y="560" text-anchor="middle" font-family="Arial,sans-serif" font-size="32" font-weight="800" fill="#171512">NOMAD</text>
        <text x="540" y="610" text-anchor="middle" font-family="Arial,sans-serif" font-size="19" fill="#555555">TRAVEL MUG</text>
        <path d="M430 405 Q510 365 600 385" fill="none" stroke="#ffffff" stroke-width="20" stroke-linecap="round" opacity=".5"/>
      </g>
      <text x="540" y="1020" text-anchor="middle" font-family="Arial,sans-serif" font-size="30" font-weight="700" fill="#171512">REAL PRODUCT IMAGE · VIEW ${index + 1}</text>
    </svg>`;
    await sharp(Buffer.from(svg)).jpeg({ quality: 92 }).toFile(output);
    const stat = await fs.stat(output);
    assets.push({
      id: randomUUID(),
      kind: "product_image" as const,
      originalName: `demo-product-${index + 1}.jpg`,
      storedName,
      mimeType: "image/jpeg",
      size: stat.size,
      relativePath: `assets/${storedName}`,
    });
  }
  const animalStoredName = `${randomUUID()}.png`;
  const animalOutput = path.join(root, "assets", animalStoredName);
  const animalSvg = `<svg width="640" height="640" viewBox="0 0 640 640" xmlns="http://www.w3.org/2000/svg">
    <defs><filter id="s"><feDropShadow dx="0" dy="20" stdDeviation="16" flood-opacity=".25"/></filter></defs>
    <g filter="url(#s)">
      <path d="M125 215 L170 55 L270 170 Q320 140 370 170 L470 55 L515 215 Q565 300 515 425 Q455 565 320 570 Q185 565 125 425 Q75 300 125 215Z" fill="#F47B3A"/>
      <path d="M155 175 L180 92 L240 185Z" fill="#3B2923"/><path d="M485 175 L460 92 L400 185Z" fill="#3B2923"/>
      <ellipse cx="320" cy="390" rx="145" ry="125" fill="#FFF2DE"/>
      <ellipse cx="255" cy="315" rx="24" ry="32" fill="#241A17"/><ellipse cx="385" cy="315" rx="24" ry="32" fill="#241A17"/>
      <circle cx="247" cy="305" r="7" fill="white"/><circle cx="377" cy="305" r="7" fill="white"/>
      <path d="M295 375 Q320 395 345 375 Q340 420 320 425 Q300 420 295 375Z" fill="#241A17"/>
      <path d="M250 455 Q320 505 390 455" fill="none" stroke="#D85836" stroke-width="18" stroke-linecap="round"/>
    </g>
  </svg>`;
  await sharp(Buffer.from(animalSvg)).png().toFile(animalOutput);
  const animalStat = await fs.stat(animalOutput);
  const animalAsset = {
    id: randomUUID(),
    kind: "animal" as const,
    originalName: "nomad-fox.png",
    storedName: animalStoredName,
    mimeType: "image/png",
    size: animalStat.size,
    relativePath: `assets/${animalStoredName}`,
  };

  const now = new Date().toISOString();
  await storage.writeProduct({
    id: productId,
    name: "NOMAD 随行保温杯",
    category: "家居与户外用品",
    description: "一款适合通勤、运动和短途旅行的轻量随行杯，杯身简洁，握持舒适。",
    sellingPoints: ["双层隔热，冷热皆宜", "旋拧防漏杯盖", "轻量杯身便于随身携带"],
    targetAudience: "重视设计感与便携性的都市通勤人群",
    price: "限时 ¥129",
    callToAction: "现在下单，开启轻松随行",
    platforms: ["douyin", "xiaohongshu"],
    language: "简体中文",
    duration: 15,
    brandName: "NOMAD",
    brandColor: "#FF6B4A",
    animal: {
      enabled: true,
      name: "诺诺狐",
      personality: "活泼、好奇、喜欢帮主持人做商品挑战",
      motion: "auto",
      interactionTemplate: "auto",
      choiceA: "更看重保温防漏",
      choiceB: "更看重轻便设计",
    },
    createdAt: now,
    updatedAt: now,
    assets: { productImages: assets, animal: animalAsset },
  });
  await storage.writeJob({
    id: randomUUID(),
    productId,
    status: "uploaded",
    progress: 5,
    currentMessage: "示例商品已创建",
    createdAt: now,
    updatedAt: now,
    provider: "mock",
    artifacts: [],
    outputs: [],
  });
  console.log("2/4 正在生成三套 Mock 创意、配音与字幕…");
  console.log("3/4 正在用 FFmpeg 合成 3 个竖屏视频（可能需要几分钟）…");
  await workflow.startWorkflow(productId, { regenerateConcepts: true });
  const job = await storage.readJob(productId);
  if (job.status !== "completed") throw new Error(job.error || "Demo 生成失败");
  console.log("4/4 Demo 生成完成。");
  console.log(`打开：http://localhost:3000/products/${productId}`);
  console.log(`输出目录：${path.join(root, "output")}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
