import { changePasswordAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const query = await searchParams;
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-3xl font-black">账号设置</h1>
      <Card className="mt-6">
        <CardHeader><h2 className="text-xl font-black">修改密码</h2><p className="mt-2 text-sm text-black/50">密码至少8个字符。系统不会在业务表或日志中保存密码。</p></CardHeader>
        <CardContent>
          {query.error && <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{query.error}</div>}
          {query.success && <div className="mb-4 rounded-xl bg-green-50 p-3 text-sm text-green-700">密码已更新。</div>}
          <form action={changePasswordAction} className="space-y-4">
            <div><Label htmlFor="password">新密码</Label><Input id="password" name="password" type="password" minLength={8} required /></div>
            <div><Label htmlFor="confirm">再次输入</Label><Input id="confirm" name="confirm" type="password" minLength={8} required /></div>
            <Button type="submit">保存新密码</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
