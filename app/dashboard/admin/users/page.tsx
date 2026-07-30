import { redirect } from "next/navigation";
import { createUserAction, resetUserPasswordAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireUser } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const { supabase, user } = await requireUser();
  const { data: self } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (self?.role !== "admin") redirect("/dashboard");
  const query = await searchParams;
  const { data: profiles } = await supabase.from("profiles").select("id,username,role,created_at").order("created_at", { ascending: false });
  return (
    <div>
      <h1 className="text-3xl font-black">用户管理</h1>
      <p className="mt-2 text-black/50">仅管理员可以创建账号和重置密码。</p>
      {query.error && <div className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{query.error}</div>}
      {query.success && <div className="mt-5 rounded-xl bg-green-50 p-3 text-sm text-green-700">操作成功。</div>}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card><CardHeader><h2 className="text-xl font-black">添加用户</h2></CardHeader><CardContent><form action={createUserAction} className="space-y-4"><div><Label>账号</Label><Input name="username" required /></div><div><Label>初始密码</Label><Input name="password" type="password" minLength={8} required /></div><Button type="submit">创建账号</Button></form></CardContent></Card>
        <Card><CardHeader><h2 className="text-xl font-black">重置用户密码</h2></CardHeader><CardContent><form action={resetUserPasswordAction} className="space-y-4"><div><Label>账号</Label><Input name="username" required /></div><div><Label>新密码</Label><Input name="password" type="password" minLength={8} required /></div><Button type="submit" variant="outline">重置密码</Button></form></CardContent></Card>
      </div>
      <Card className="mt-6"><CardContent className="overflow-x-auto p-0"><table className="w-full min-w-[32rem] text-left text-sm"><thead className="border-b border-black/10 text-black/45"><tr><th className="p-4">账号</th><th className="p-4">角色</th><th className="p-4">创建时间</th></tr></thead><tbody>{profiles?.map((profile) => <tr className="border-b border-black/5" key={profile.id}><td className="p-4 font-bold">{profile.username}</td><td className="p-4">{profile.role}</td><td className="p-4 text-black/50">{formatDate(profile.created_at)}</td></tr>)}</tbody></table></CardContent></Card>
    </div>
  );
}
