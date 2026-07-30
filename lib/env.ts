import "server-only";
import { serverEnvSchema, type ServerEnv } from "@/lib/env-schema";

export { serverEnvSchema } from "@/lib/env-schema";

let cached: ServerEnv | undefined;

export function getEnv() {
  cached ??= serverEnvSchema.parse(process.env);
  return cached;
}

export function requireSupabaseEnv() {
  const env = getEnv();
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("缺少 Supabase 配置，请填写 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY。");
  }
  return env;
}

export function requireServiceRoleEnv() {
  const env = requireSupabaseEnv();
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("缺少服务器端 SUPABASE_SERVICE_ROLE_KEY。");
  }
  return env;
}

export function resetEnvForTests() {
  cached = undefined;
}
