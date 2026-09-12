"use client";

import { AI_PRESENCE_META } from "@/types/ai";
import { PresenceOrb } from "@/components/ai/presence-orb";
import { PresenceBadge } from "@/components/ai/presence-badge";
import { useChatContext } from "@/components/providers/chat-provider";

export function ConversationHeader() {
  const { presence, profile } = useChatContext();

  return (
    <header className="flex items-center gap-3 border-b border-border/70 px-4 py-3 sm:px-6">
      <PresenceOrb presence={presence} size="sm" />
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-sm font-semibold text-foreground">{profile.name}</h1>
        <PresenceBadge presence={presence} />
      </div>
      <span
        className="hidden shrink-0 rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground sm:inline-block"
        title={AI_PRESENCE_META[presence].description}
      >
        {profile.model}
      </span>
    </header>
  );
}
