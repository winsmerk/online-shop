import type { ConceptsResponse, Product, VideoConcept } from "@/schemas";

export interface AiProvider {
  readonly name: "openai" | "mock";
  analyzeAndCreateConcepts(product: Product, debugDir: string): Promise<ConceptsResponse>;
  generateVoice(concept: VideoConcept, outputPath: string, duration: number): Promise<void>;
}
