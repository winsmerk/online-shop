import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("username,role").eq("id", data.user.id).single();
  return <DashboardShell username={profile?.username || "用户"} role={profile?.role || "user"}>{children}</DashboardShell>;
}
