"use server";

import { redirect } from "next/navigation";
import { passwordSchema, usernameToInternalEmail } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";

export async function loginAction(formData: FormData) {
  const username = String(formData.get("username") || "");
  const password = passwordSchema.parse(String(formData.get("password") || ""));
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: usernameToInternalEmail(username),
    password,
  });
  if (error) redirect(`/login?error=${encodeURIComponent("账号或密码错误")}`);
  redirect("/dashboard");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

