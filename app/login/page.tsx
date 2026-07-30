import Link from "next/link";
import { Clapperboard, LockKeyhole } from "lucide-react";
import { loginAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const message = error === "supabase_not_configured"
    ? "请先按 README 配置 Supabase 环境变量。"
    : error;
  return (
    <main className="grid min-h-screen place-items-center px-5 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Link href="/" className="mb-8 flex items-center gap-3 font-black">
            <span className="grid size-10 place-items-center rounded-xl bg-ink text-lime"><Clapperboard className="size-5" /></span>
            AI 商品视频
          </Link>
          <div className="grid size-12 place-items-center rounded-2xl bg-coral/10 text-coral"><LockKeyhole /></div>
          <h1 className="mt-4 text-3xl font-black">登录控制台</h1>
          <p className="mt-2 text-sm leading-6 text-black/55">账号由管理员创建。密码由 Supabase Auth 安全保存。</p>
        </CardHeader>
        <CardContent>
          {message && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{message}</div>}
          <form action={loginAction} className="space-y-4">
            <div><Label htmlFor="username">账号</Label><Input id="username" name="username" autoComplete="username" required /></div>
            <div><Label htmlFor="password">密码</Label><Input id="password" name="password" type="password" autoComplete="current-password" minLength={8} required /></div>
            <Button className="w-full" type="submit">登录</Button>
          </form>
          <p className="mt-5 text-center text-xs leading-5 text-black/45">忘记密码请联系管理员重置；登录后可自行修改密码。</p>
        </CardContent>
      </Card>
    </main>
  );
}

