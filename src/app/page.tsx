import Link from "next/link";
import { ArrowRight, ImageIcon, LayoutGrid, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const modules = [
  {
    href: "/upload",
    title: "图片上传",
    description: "拖拽多文件、直传 R2，实时进度反馈",
    icon: Upload,
    accent: "from-sky-500/15 to-sky-500/5 text-sky-600",
  },
  {
    href: "/manage",
    title: "图片管理",
    description: "文件夹浏览、搜索排序、批量移动与删除",
    icon: LayoutGrid,
    accent: "from-emerald-500/15 to-emerald-500/5 text-emerald-600",
  },
  {
    href: "/gallery",
    title: "图片预览",
    description: "瀑布流随机展示，无限滚动与灯箱查看",
    icon: ImageIcon,
    accent: "from-violet-500/15 to-violet-500/5 text-violet-600",
  },
];

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="surface-card relative overflow-hidden px-6 py-10 sm:px-10 sm:py-12">
        <div className="relative z-10 mx-auto max-w-2xl text-center">
          <p className="mb-3 text-sm font-medium tracking-wide text-primary uppercase">
            Cloudflare R2 图床
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            轻量、高效的图片资源管理
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            无需数据库，预签名直传 R2。上传、管理与预览一站式完成。
          </p>
        </div>
        <div className="pointer-events-none absolute -top-16 right-0 size-56 rounded-full bg-primary/10 blur-3xl" />
      </section>

      <div className="grid gap-5 md:grid-cols-3">
        {modules.map((mod) => {
          const Icon = mod.icon;
          return (
            <Card
              key={mod.href}
              className="surface-card group border-border/60 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <CardHeader className="space-y-4">
                <div
                  className={`inline-flex size-11 items-center justify-center rounded-xl bg-gradient-to-br ${mod.accent}`}
                >
                  <Icon className="size-5" />
                </div>
                <div className="space-y-1.5">
                  <CardTitle>{mod.title}</CardTitle>
                  <CardDescription>{mod.description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  render={<Link href={mod.href} />}
                  nativeButton={false}
                  className="h-9 w-full"
                >
                  进入
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
