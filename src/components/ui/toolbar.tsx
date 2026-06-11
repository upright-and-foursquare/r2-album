import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Toolbar({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-xl border bg-muted/30 p-2",
        className
      )}
    >
      {children}
    </div>
  );
}

export function ToolbarGroup({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {children}
    </div>
  );
}

export function ToolbarSeparator() {
  return <div className="mx-1 hidden h-6 w-px bg-border sm:block" />;
}
