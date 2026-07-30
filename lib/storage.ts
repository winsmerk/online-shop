import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { config } from "@/lib/config";
import { generationJobSchema, productSchema, type GenerationJob, type Product } from "@/schemas";

export const PRODUCT_DIRS = ["assets", "concepts", "audio", "subtitles", "scenes", "output", "logs"] as const;

export function assertSafeId(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("无效的任务 ID");
  return id;
}

export function productDir(productId: string) {
  return path.join(config.storageRoot, assertSafeId(productId));
}

export async function ensureProductDirectories(productId: string) {
  const root = productDir(productId);
  await fs.mkdir(root, { recursive: true });
  await Promise.all(PRODUCT_DIRS.map((dir) => fs.mkdir(path.join(root, dir), { recursive: true })));
  return root;
}

export async function writeJsonAtomic(filePath: string, value: unknown) {
  const tempPath = `${filePath}.${randomUUID()}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(value, null, 2), { encoding: "utf8", mode: 0o600 });
  await fs.rename(tempPath, filePath);
}

export async function readProduct(productId: string): Promise<Product> {
  const raw = await fs.readFile(path.join(productDir(productId), "product.json"), "utf8");
  return productSchema.parse(JSON.parse(raw));
}

export async function writeProduct(product: Product) {
  await ensureProductDirectories(product.id);
  await writeJsonAtomic(path.join(productDir(product.id), "product.json"), product);
}

export async function readJob(productId: string): Promise<GenerationJob> {
  const raw = await fs.readFile(path.join(productDir(productId), "job.json"), "utf8");
  return generationJobSchema.parse(JSON.parse(raw));
}

export async function writeJob(job: GenerationJob) {
  await writeJsonAtomic(path.join(productDir(job.productId), "job.json"), job);
}

export async function listProducts(): Promise<Product[]> {
  await fs.mkdir(config.storageRoot, { recursive: true });
  const entries = await fs.readdir(config.storageRoot, { withFileTypes: true });
  const products = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory() && /^[0-9a-f-]{36}$/i.test(entry.name))
      .map(async (entry) => {
        try {
          return await readProduct(entry.name);
        } catch {
          return null;
        }
      }),
  );
  return products.filter((product): product is Product => product !== null).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
