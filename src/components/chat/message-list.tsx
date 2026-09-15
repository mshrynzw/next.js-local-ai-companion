"use client";

import * as React from "react";
import { ArrowDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "./chat-message";
import { EmptyState } from "./empty-state";
import type { ChatMessage as ChatMessageType } from "@/types/ai";

export interface MessageListProps {
  messages: ChatMessageType[];
  onSuggestion: (text: string) => void;
  speakingMessageId?: string | null;
  onSpeak?: (messageId: string) => void;
}

const BOTTOM_THRESHOLD = 96;

export function MessageList({
  messages,
  onSuggestion,
  speakingMessageId = null,
  onSpeak,
}: MessageListProps) {
  const viewportRef = React.useRef<HTMLDivElement | null>(null);
  const [stickToBottom, setStickToBottom] = React.useState(true);

  React.useEffect(() => {
    if (!stickToBottom) return;
    const el = viewportRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, stickToBottom]);

  const handleScroll = React.useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setStickToBottom(distanceFromBottom < BOTTOM_THRESHOLD);
  }, []);

  const scrollToBottom = () => {
    const el = viewportRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    setStickToBottom(true);
  };

  if (messages.length === 0) {
    return <EmptyState onSuggestion={onSuggestion} />;
  }

  return (
    <div className="relative min-h-0 flex-1">
      <ScrollArea
        className="h-full"
        viewportRef={viewportRef}
        viewportProps={{ onScroll: handleScroll }}
      >
        <div className="flex flex-col gap-4 py-5">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              isSpeaking={speakingMessageId === message.id}
              onSpeak={onSpeak}
            />
          ))}
        </div>
      </ScrollArea>

      {!stickToBottom && (
        <Button
          variant="secondary"
          size="icon"
          onClick={scrollToBottom}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-border shadow-md"
          aria-label="最新のメッセージまでスクロール"
        >
          <ArrowDown className="size-4" />
        </Button>
      )}
    </div>
  );
}
