"use server";

import { redirect } from "next/navigation";
import { passwordSchema, usernameSchema, usernameToInternalEmail } from "@/lib/auth/identity";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/server";

async function requireAdmin() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (data?.role !== "admin") throw new Error("仅管理员可执行此操作");
}

export async function createUserAction(formData: FormData) {
  try {
    await requireAdmin();
    const username = usernameSchema.parse(String(formData.get("username") || ""));
    const password = passwordSchema.parse(String(formData.get("password") || ""));
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.createUser({
      email: usernameToInternalEmail(username),
      password,
      email_confirm: true,
      user_metadata: { username, role: "user" },
    });
    if (error) throw error;
    redirect("/dashboard/admin/users?success=created");
  } catch (error) {
    redirect(`/dashboard/admin/users?error=${encodeURIComponent(error instanceof Error ? error.message : "创建用户失败")}`);
  }
}

export async function resetUserPasswordAction(formData: FormData) {
  try {
    await requireAdmin();
    const username = usernameSchema.parse(String(formData.get("username") || ""));
    const password = passwordSchema.parse(String(formData.get("password") || ""));
    const admin = createAdminClient();
    const { data: profile } = await admin.from("profiles").select("id").eq("username", username).maybeSingle();
    if (!profile) throw new Error("用户不存在");
    const { error } = await admin.auth.admin.updateUserById(profile.id, { password });
    if (error) throw error;
    redirect("/dashboard/admin/users?success=reset");
  } catch (error) {
    redirect(`/dashboard/admin/users?error=${encodeURIComponent(error instanceof Error ? error.message : "重置密码失败")}`);
  }
}

