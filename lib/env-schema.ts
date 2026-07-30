import { z } from "zod";

const optionalUrl = z.union([
  z.literal(""),
  z.string().url().refine((value) => value.startsWith("http://") || value.startsWith("https://"), "仅支持HTTP(S) URL"),
]);

export const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: optionalUrl.default(""),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().default(""),
  SUPABASE_SERVICE_ROLE_KEY: z.string().default(""),
  OPENAI_API_KEY: z.string().default(""),
  OPENAI_MODEL: z.string().default("gpt-4.1-mini"),
  VIDEO_PROVIDER: z.enum(["mock", "vidnoz"]).default("mock"),
  VIDNOZ_API_BASE_URL: optionalUrl.default("https://devapi.vidnoz.com"),
  VIDNOZ_API_KEY: z.string().default(""),
  VIDNOZ_CLIENT_ID: z.string().default(""),
  VIDNOZ_CLIENT_SECRET: z.string().default(""),
  VIDNOZ_DEFAULT_AVATAR_ID: z.string().default("mock-avatar-1"),
  VIDNOZ_DEFAULT_VOICE_ID: z.string().default("mock-voice-1"),
  VIDNOZ_WEBHOOK_SECRET: z.string().default(""),
  CRON_SECRET: z.string().default(""),
  APP_URL: optionalUrl.default("http://localhost:3000"),
  VIDEO_URL_CACHE_SECONDS: z.coerce.number().int().min(30).max(3600).default(300),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
