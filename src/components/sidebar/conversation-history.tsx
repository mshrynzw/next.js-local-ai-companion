"use client";

import { MessageCircle } from "lucide-react";

import { ConversationItem } from "./conversation-item";
import { groupConversationsByRecency } from "@/lib/date";
import type { Conversation } from "@/types/ai";

export interface ConversationHistoryProps {
  conversations: Conversation[];
  activeId: string | undefined;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ConversationHistory({
  conversations,
  activeId,
  onSelect,
  onDelete,
}: ConversationHistoryProps) {
  const groups = groupConversationsByRecency(conversations);

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sidebar-foreground/40">
        <MessageCircle className="size-6" />
        <p className="text-xs">まだ会話がありません</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <div key={group.key} className="flex flex-col gap-1">
          <h3 className="px-2.5 text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/35">
            {group.label}
          </h3>
          <div className="flex flex-col gap-0.5">
            {group.items.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                active={conversation.id === activeId}
                onSelect={() => onSelect(conversation.id)}
                onDelete={() => onDelete(conversation.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
