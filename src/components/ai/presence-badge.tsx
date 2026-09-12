"use client";

import { AI_PRESENCE_META, type AIPresence } from "@/types/ai";
import { cn } from "@/lib/utils";
import { StatusDot } from "./status-dot";

export interface PresenceBadgeProps {
  presence: AIPresence;
  className?: string;
}

/** "● Online" style presence readout, shown beside the AI's name. */
export function PresenceBadge({ presence, className }: PresenceBadgeProps) {
  const meta = AI_PRESENCE_META[presence];

  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)}
      role="status"
      aria-live="polite"
    >
      <StatusDot presence={presence} />
      <span className={cn(presence === "offline" && "text-status-offline")}>{meta.label}</span>
    </span>
  );
}
