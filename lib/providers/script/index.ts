import "server-only";
import { getEnv } from "@/lib/env";
import { MockScriptProvider } from "./mock";
import { OpenAIScriptProvider } from "./openai";
import type { ScriptProvider } from "./types";

export function createScriptProvider(): ScriptProvider {
  return getEnv().OPENAI_API_KEY ? new OpenAIScriptProvider() : new MockScriptProvider();
}

export * from "./types";
export * from "./mock";
export * from "./openai";

