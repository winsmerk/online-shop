import type { Product, VideoConcept } from "@/schemas";

export interface PresenterResult {
  videoPath: string;
  providerJobId: string;
  sourceDuration: number;
  targetDuration: number;
}

export interface AvatarProvider {
  readonly name: "heygen";
  generatePresenter(
    product: Product,
    concept: VideoConcept,
    outputPath: string,
    debugDir: string,
  ): Promise<PresenterResult>;
}
