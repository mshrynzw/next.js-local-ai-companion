"use client";

import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PresenceOrb } from "@/components/ai/presence-orb";
import { useChatContext } from "@/components/providers/chat-provider";

export function MobileTopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { presence } = useChatContext();

  return (
    <div className="flex items-center gap-2 border-b border-border bg-background/80 px-2 py-2 backdrop-blur md:hidden">
      <Button variant="ghost" size="icon" onClick={onMenuClick} aria-label="メニューを開く">
        <Menu className="size-5" />
      </Button>
      <PresenceOrb presence={presence} size="sm" />
      <span className="text-sm font-medium text-foreground">Local AI Companion</span>
    </div>
  );
}
