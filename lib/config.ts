import path from "node:path";

const intEnv = (name: string, fallback: number) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
};

export const config = {
  storageRoot: path.resolve(process.cwd(), "storage", "products"),
  ffmpegPath: process.env.FFMPEG_PATH || "ffmpeg",
  ffprobePath: process.env.FFPROBE_PATH || "ffprobe",
  openaiModel: process.env.OPENAI_MODEL || "gpt-4.1-mini",
  ttsModel: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
  ttsVoice: process.env.OPENAI_TTS_VOICE || "alloy",
  openaiTimeoutMs: intEnv("OPENAI_REQUEST_TIMEOUT_MS", 90_000),
  workflowTimeoutMs: intEnv("WORKFLOW_TIMEOUT_MS", 600_000),
  maxOutputTokens: intEnv("OPENAI_MAX_OUTPUT_TOKENS", 8_000),
  maxRetries: Math.min(intEnv("OPENAI_MAX_RETRIES", 2), 3),
  maxCallsPerJob: Math.min(intEnv("OPENAI_MAX_CALLS_PER_JOB", 10), 20),
  heygenTimeoutMs: intEnv("HEYGEN_REQUEST_TIMEOUT_MS", 90_000),
  heygenPollIntervalMs: Math.max(1_000, intEnv("HEYGEN_POLL_INTERVAL_MS", 5_000)),
  heygenMaxPolls: Math.min(intEnv("HEYGEN_MAX_POLLS", 120), 240),
  heygenMaxVideosPerJob: Math.min(intEnv("HEYGEN_MAX_VIDEOS_PER_JOB", 3), 3),
  provider: process.env.AI_PROVIDER || "auto",
  imageMaxBytes: 10 * 1024 * 1024,
  audioMaxBytes: 20 * 1024 * 1024,
} as const;

export const isMockMode = () =>
  config.provider === "mock" || (config.provider === "auto" && !process.env.OPENAI_API_KEY);
