"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/date";
import type { Conversation } from "@/types/ai";

export interface ConversationItemProps {
  conversation: Conversation;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export function ConversationItem({ conversation, active, onSelect, onDelete }: ConversationItemProps) {
  const lastMessage = conversation.messages[conversation.messages.length - 1];

  return (
    <div
      className={cn(
        "group relative flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 flex-col items-start text-left outline-none"
        aria-current={active ? "true" : undefined}
      >
        <span className="w-full truncate font-medium">{conversation.title}</span>
        {lastMessage && (
          <span className="w-full truncate text-xs text-sidebar-foreground/50">
            {lastMessage.content.replace(/\n/g, " ").slice(0, 32)}
          </span>
        )}
      </button>

      {/* suppressHydrationWarning: relative time is computed against "now",
          which can tick over a minute boundary between the server render
          and client hydration -- a one-word difference that's expected. */}
      <span
        className="shrink-0 text-[11px] text-sidebar-foreground/40 group-hover:hidden"
        suppressHydrationWarning
      >
        {formatRelativeTime(conversation.updatedAt)}
      </span>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="hidden shrink-0 text-sidebar-foreground/50 hover:text-destructive-foreground group-hover:inline-flex"
            aria-label={`「${conversation.title}」を削除`}
          >
            <Trash2 />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">削除</TooltipContent>
      </Tooltip>
    </div>
  );
}
