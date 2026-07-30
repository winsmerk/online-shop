import "server-only";
import { getEnv } from "@/lib/env";
import { MockVideoProvider } from "./mock";
import { VidnozProvider } from "./vidnoz";
import type { VideoProvider } from "./types";

export function createVideoProvider(): VideoProvider {
  return getEnv().VIDEO_PROVIDER === "vidnoz" ? new VidnozProvider() : new MockVideoProvider();
}

export * from "./types";
export * from "./values";
export * from "./mock";
export * from "./vidnoz";
