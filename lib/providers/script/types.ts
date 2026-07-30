import type { GeneratedScript, GenerateScriptInput } from "@/lib/domain/video";

export interface ScriptProvider {
  generateScript(input: GenerateScriptInput): Promise<GeneratedScript>;
}

