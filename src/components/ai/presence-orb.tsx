import { cn } from "@/lib/utils";
import type { AIPresence } from "@/types/ai";

const RING_COLOR: Record<AIPresence, string> = {
  idle: "from-cyan-400/70 to-indigo-500/70",
  listening: "from-cyan-300/90 to-cyan-500/60",
  thinking: "from-violet-400/90 to-indigo-500/70",
  speaking: "from-indigo-400/90 to-cyan-400/70",
  offline: "from-zinc-500/40 to-zinc-600/30",
};

export interface PresenceOrbProps {
  presence: AIPresence;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASS: Record<NonNullable<PresenceOrbProps["size"]>, string> = {
  sm: "size-8",
  md: "size-10",
  lg: "size-16",
};

/**
 * The AI's abstract "face": a soft gradient orb rather than a literal
 * avatar image. Breathes gently when idle/thinking/speaking; a future
 * character or generated avatar can swap in behind the same footprint.
 */
export function PresenceOrb({ presence, size = "md", className }: PresenceOrbProps) {
  const animated = presence !== "offline";

  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-full",
        SIZE_CLASS[size],
        className,
      )}
      aria-hidden
    >
      <div
        className={cn(
          "absolute inset-0 rounded-full bg-gradient-to-br blur-[1px]",
          RING_COLOR[presence],
          animated && "animate-orb-breathe",
        )}
      />
      <div className="absolute inset-[3px] rounded-full bg-background/90 backdrop-blur-sm" />
      <div
        className={cn(
          "absolute inset-[3px] rounded-full bg-gradient-to-br opacity-60",
          RING_COLOR[presence],
        )}
      />
    </div>
  );
}
