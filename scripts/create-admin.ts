import { createClient } from "@supabase/supabase-js";
import { serverEnvSchema } from "../lib/env-schema";
import { passwordSchema, usernameSchema, usernameToInternalEmail } from "../lib/auth/identity";

async function main() {
  const env = serverEnvSchema.parse(process.env);
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("请先配置 NEXT_PUBLIC_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY");
  }
  const username = usernameSchema.parse(process.env.ADMIN_USERNAME || "admin");
  const password = passwordSchema.parse(process.env.ADMIN_PASSWORD);
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase.auth.admin.createUser({
    email: usernameToInternalEmail(username),
    password,
    email_confirm: true,
    user_metadata: { username, role: "admin" },
  });
  if (error) throw error;
  console.log(`管理员 ${username} 已创建（用户ID：${data.user.id}）`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "创建管理员失败");
  process.exitCode = 1;
});
