import { AlertTriangle } from "lucide-react";

import { PresenceOrb } from "@/components/ai/presence-orb";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MarkdownContent } from "./markdown-content";
import { TypingIndicator } from "./typing-indicator";
import { formatClockTime } from "@/lib/date";
import type { ChatMessage as ChatMessageType } from "@/types/ai";

export interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isEmpty = message.content.length === 0;

  if (isUser) {
    return (
      <div className="flex animate-fade-in-up justify-end gap-3 px-4 sm:px-6">
        <div className="flex max-w-[85%] flex-col items-end gap-1 sm:max-w-[70%]">
          <div className="rounded-2xl rounded-tr-md bg-primary/15 px-4 py-2.5 text-sm text-foreground">
            <MarkdownContent content={message.content} />
          </div>
          <time className="px-1 text-[11px] text-muted-foreground/70" dateTime={message.createdAt} suppressHydrationWarning>
            {formatClockTime(message.createdAt)}
          </time>
        </div>
        <Avatar className="mt-0.5 size-7 shrink-0">
          <AvatarFallback className="bg-secondary text-[11px] text-secondary-foreground">
            You
          </AvatarFallback>
        </Avatar>
      </div>
    );
  }

  return (
    <div className="flex animate-fade-in-up gap-3 px-4 sm:px-6">
      <PresenceOrb presence="idle" size="sm" className="mt-0.5 shrink-0" />
      <div className="flex max-w-[85%] flex-col items-start gap-1 sm:max-w-[75%]">
        <div className="rounded-2xl rounded-tl-md bg-card px-4 py-2.5 text-sm text-card-foreground">
          {isEmpty && message.status === "streaming" ? (
            <TypingIndicator />
          ) : (
            <MarkdownContent content={message.content} />
          )}
          {message.status === "error" && (
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-destructive-foreground/90">
              <AlertTriangle className="size-3.5" />
              応答の生成中にエラーが発生しました。
            </div>
          )}
        </div>
        {!isEmpty && (
          <time className="px-1 text-[11px] text-muted-foreground/70" dateTime={message.createdAt} suppressHydrationWarning>
            {formatClockTime(message.createdAt)}
          </time>
        )}
      </div>
    </div>
  );
}
