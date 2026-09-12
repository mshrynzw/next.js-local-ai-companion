import { cn } from "@/lib/utils";
import type { AIPresence } from "@/types/ai";

const DOT_COLOR: Record<AIPresence, string> = {
  idle: "bg-status-online",
  listening: "bg-status-listening",
  thinking: "bg-status-thinking",
  speaking: "bg-status-speaking",
  offline: "bg-status-offline",
};

const PULSES: AIPresence[] = ["listening", "thinking", "speaking"];

export interface StatusDotProps {
  presence: AIPresence;
  className?: string;
}

/**
 * A small presence indicator dot. Active states (listening / thinking /
 * speaking) get a soft expanding pulse ring; idle ("Online") is a steady
 * glow; offline is dim and static.
 */
export function StatusDot({ presence, className }: StatusDotProps) {
  const pulse = PULSES.includes(presence);

  return (
    <span className={cn("relative inline-flex size-2.5", className)}>
      {pulse && (
        <span
          className={cn(
            "absolute inline-flex h-full w-full animate-pulse-ring rounded-full",
            DOT_COLOR[presence],
          )}
          aria-hidden
        />
      )}
      <span
        className={cn(
          "relative inline-flex size-2.5 rounded-full",
          DOT_COLOR[presence],
          presence === "idle" && "shadow-[0_0_6px_var(--color-status-online)]",
        )}
      />
    </span>
  );
}
