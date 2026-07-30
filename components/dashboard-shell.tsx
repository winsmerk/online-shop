import Link from "next/link";
import { Clapperboard, LayoutDashboard, LogOut, PlusCircle, Settings } from "lucide-react";
import { logoutAction } from "@/app/login/actions";
import { Button } from "@/components/ui/button";

export function DashboardShell({ username, role, children }: { username: string; role: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-black/10 bg-cream/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/dashboard" className="flex items-center gap-3 font-black">
            <span className="grid size-9 place-items-center rounded-xl bg-ink text-lime"><Clapperboard className="size-4" /></span>
            <span className="hidden sm:inline">AI 商品视频</span>
          </Link>
          <nav className="flex items-center gap-1">
            <Button asChild variant="ghost" size="sm"><Link href="/dashboard"><LayoutDashboard className="size-4" />任务</Link></Button>
            <Button asChild variant="ghost" size="sm"><Link href="/dashboard/create"><PlusCircle className="size-4" />新建</Link></Button>
            <Button asChild variant="ghost" size="sm"><Link href="/dashboard/settings"><Settings className="size-4" /><span className="hidden sm:inline">设置</span></Link></Button>
            {role === "admin" && <Button asChild variant="ghost" size="sm"><Link href="/dashboard/admin/users">用户</Link></Button>}
          </nav>
          <form action={logoutAction}>
            <Button type="submit" variant="outline" size="sm"><span className="hidden sm:inline">{username}</span><LogOut className="size-4" /></Button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
