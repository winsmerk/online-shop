import type { Product, VideoConcept } from "@/schemas";

export interface ComposeResult {
  videoPath: string;
  scenePaths: string[];
}

export interface VideoProvider {
  readonly name: string;
  compose(
    product: Product,
    concept: VideoConcept,
    productRoot: string,
    voicePath: string,
    assPath: string,
    presenterPath?: string,
  ): Promise<ComposeResult>;
}
