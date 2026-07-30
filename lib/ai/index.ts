import { isMockMode } from "@/lib/config";
import { MockAiProvider } from "./mock-provider";
import { OpenAiProvider } from "./openai-provider";
import type { AiProvider } from "./provider";

export function createAiProvider(): AiProvider {
  return isMockMode() ? new MockAiProvider() : new OpenAiProvider();
}

export * from "./provider";
export * from "./parse";
