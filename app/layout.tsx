import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 商品宣传视频",
  description: "上传商品图片，确认口播脚本，异步生成数字人商品视频",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
