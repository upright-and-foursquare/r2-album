"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ImageIcon, LayoutGrid, Upload } from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/upload", label: "上传", icon: Upload },
  { href: "/manage", label: "管理", icon: LayoutGrid },
  { href: "/gallery", label: "预览", icon: ImageIcon },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 font-semibold transition-colors hover:bg-muted/60"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ImageIcon className="size-4" />
            </span>
            <span>R2 图床</span>
          </Link>
          <nav className="flex items-center gap-1 rounded-xl border bg-muted/40 p-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
