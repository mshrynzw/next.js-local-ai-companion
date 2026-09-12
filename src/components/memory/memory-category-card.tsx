import type { LucideIcon } from "lucide-react";

export function MemoryCategoryCard({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
      <div className="rounded-lg border border-dashed border-border/80 px-3 py-4 text-center text-xs text-muted-foreground/60">
        まだ記憶がありません
      </div>
    </div>
  );
}
