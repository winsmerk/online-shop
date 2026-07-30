"use server";

import { redirect } from "next/navigation";
import { passwordSchema } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";

export async function changePasswordAction(formData: FormData) {
  const password = passwordSchema.parse(String(formData.get("password") || ""));
  const confirm = String(formData.get("confirm") || "");
  if (password !== confirm) redirect("/dashboard/settings?error=两次密码不一致");
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect(`/dashboard/settings?error=${encodeURIComponent(error.message)}`);
  redirect("/dashboard/settings?success=1");
}

