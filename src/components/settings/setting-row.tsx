import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function SettingRow({
  label,
  description,
  children,
  align = "center",
  className,
}: {
  label: string;
  description?: string;
  children: ReactNode;
  align?: "center" | "start";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 py-4 sm:flex-row sm:gap-6",
        align === "center" ? "sm:items-center" : "sm:items-start",
        className,
      )}
    >
      <div className="sm:w-56 sm:shrink-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="flex-1 sm:max-w-sm">{children}</div>
    </div>
  );
}

export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-1">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="divide-y divide-border/70">{children}</div>
    </section>
  );
}

export function ComingSoonBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
      近日対応
    </span>
  );
}
