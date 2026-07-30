import { readFile } from "node:fs/promises";
import path from "node:path";
import { productSchema, conceptsResponseSchema } from "../schemas";
import { LocalMotionProvider } from "../providers/video";

async function main() {
  const root = process.argv[2];
  if (!root) throw new Error("Usage: tsx scripts/verify-presenter-mix.ts <copied-product-root>");
  const product = productSchema.parse(JSON.parse(await readFile(path.join(root, "product.json"), "utf8")));
  const response = conceptsResponseSchema.parse(JSON.parse(await readFile(path.join(root, "concepts", "response.json"), "utf8")));
  const concept = response.concepts[0];
  const provider = new LocalMotionProvider();
  const result = await provider.compose(
    product,
    concept,
    root,
    path.join(root, "audio", `${concept.id}.m4a`),
    path.join(root, "subtitles", `${concept.id}.ass`),
    path.join(root, "output", "concept-b.mp4"),
  );
  process.stdout.write(`${result.videoPath}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
