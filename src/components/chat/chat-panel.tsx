"use client";

import * as React from "react";

import { useChatContext } from "@/components/providers/chat-provider";
import { ConversationHeader } from "./conversation-header";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";

export function ChatPanel() {
  const { activeConversation, sendMessage, isGenerating, stopGenerating } = useChatContext();
  const [draft, setDraft] = React.useState("");

  const messages = activeConversation?.messages ?? [];

  const handleSubmit = () => {
    if (!draft.trim()) return;
    sendMessage(draft);
    setDraft("");
  };

  const handleSuggestion = (text: string) => {
    setDraft(text);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ConversationHeader />
      <MessageList messages={messages} onSuggestion={handleSuggestion} />
      <MessageInput
        value={draft}
        onChange={setDraft}
        onSubmit={handleSubmit}
        isGenerating={isGenerating}
        onStop={stopGenerating}
      />
    </div>
  );
}
