"use client";

import * as React from "react";

import { AI_PROFILE, DEFAULT_CONVERSATION_ID, MOCK_CONVERSATIONS } from "@/lib/mock-data";
import { OLLAMA_MODEL, streamChat, type OllamaChatMessage } from "@/lib/ollama";
import type { AICompanionProfile, AIPresence, ChatMessage, Conversation } from "@/types/ai";

/**
 * Central chat state for the app. This is where a future switch from
 * mock data to a real store (IndexedDB, SQLite via a Tauri/Electron
 * shell, or a backend API) would happen -- the components below only
 * ever see `conversations`, `activeConversation`, and the action
 * functions, never the storage details.
 */

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string;
  presence: AIPresence;
}

type Action =
  | { type: "SELECT_CONVERSATION"; id: string }
  | { type: "CREATE_CONVERSATION" }
  | { type: "DELETE_CONVERSATION"; id: string }
  | { type: "ADD_USER_MESSAGE"; conversationId: string; message: ChatMessage }
  | { type: "START_ASSISTANT_MESSAGE"; conversationId: string; message: ChatMessage }
  | { type: "APPEND_TOKEN"; conversationId: string; messageId: string; token: string }
  | {
      type: "COMPLETE_MESSAGE";
      conversationId: string;
      messageId: string;
      status: "complete" | "error";
    }
  | { type: "SET_PRESENCE"; presence: AIPresence };

function touch(conversation: Conversation, updatedAt: string): Conversation {
  return { ...conversation, updatedAt };
}

function titleFromMessage(content: string): string {
  const trimmed = content.trim().replace(/\s+/g, " ");
  return trimmed.length > 24 ? `${trimmed.slice(0, 24)}…` : trimmed || "新しい会話";
}

function reducer(state: ChatState, action: Action): ChatState {
  switch (action.type) {
    case "SELECT_CONVERSATION":
      return { ...state, activeConversationId: action.id };

    case "CREATE_CONVERSATION": {
      const now = new Date().toISOString();
      const fresh: Conversation = {
        id: `conv-${crypto.randomUUID()}`,
        title: "新しい会話",
        messages: [],
        createdAt: now,
        updatedAt: now,
      };
      return {
        ...state,
        conversations: [fresh, ...state.conversations],
        activeConversationId: fresh.id,
      };
    }

    case "DELETE_CONVERSATION": {
      const remaining = state.conversations.filter((c) => c.id !== action.id);
      const wasActive = state.activeConversationId === action.id;
      return {
        ...state,
        conversations: remaining,
        activeConversationId: wasActive
          ? (remaining[0]?.id ?? "")
          : state.activeConversationId,
      };
    }

    case "ADD_USER_MESSAGE": {
      return {
        ...state,
        conversations: state.conversations.map((c) => {
          if (c.id !== action.conversationId) return c;
          const isFirstMessage = c.messages.length === 0;
          return touch(
            {
              ...c,
              title: isFirstMessage ? titleFromMessage(action.message.content) : c.title,
              messages: [...c.messages, action.message],
            },
            action.message.createdAt,
          );
        }),
      };
    }

    case "START_ASSISTANT_MESSAGE": {
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          c.id === action.conversationId
            ? touch({ ...c, messages: [...c.messages, action.message] }, action.message.createdAt)
            : c,
        ),
      };
    }

    case "APPEND_TOKEN": {
      return {
        ...state,
        conversations: state.conversations.map((c) => {
          if (c.id !== action.conversationId) return c;
          return {
            ...c,
            messages: c.messages.map((m) =>
              m.id === action.messageId ? { ...m, content: m.content + action.token } : m,
            ),
          };
        }),
      };
    }

    case "COMPLETE_MESSAGE": {
      return {
        ...state,
        conversations: state.conversations.map((c) => {
          if (c.id !== action.conversationId) return c;
          return {
            ...c,
            messages: c.messages.map((m) =>
              m.id === action.messageId ? { ...m, status: action.status } : m,
            ),
          };
        }),
      };
    }

    case "SET_PRESENCE":
      return { ...state, presence: action.presence };

    default:
      return state;
  }
}

interface ChatContextValue {
  conversations: Conversation[];
  activeConversation: Conversation | undefined;
  presence: AIPresence;
  profile: AICompanionProfile;
  selectConversation: (id: string) => void;
  createConversation: () => void;
  deleteConversation: (id: string) => void;
  sendMessage: (content: string) => void;
  stopGenerating: () => void;
  isGenerating: boolean;
}

const ChatContext = React.createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(reducer, {
    conversations: MOCK_CONVERSATIONS,
    activeConversationId: DEFAULT_CONVERSATION_ID,
    presence: "idle",
  });

  const abortRef = React.useRef<AbortController | null>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);

  const activeConversation = state.conversations.find((c) => c.id === state.activeConversationId);

  const selectConversation = React.useCallback((id: string) => {
    abortRef.current?.abort();
    dispatch({ type: "SELECT_CONVERSATION", id });
  }, []);

  const createConversation = React.useCallback(() => {
    abortRef.current?.abort();
    dispatch({ type: "CREATE_CONVERSATION" });
  }, []);

  const deleteConversation = React.useCallback((id: string) => {
    dispatch({ type: "DELETE_CONVERSATION", id });
  }, []);

  const stopGenerating = React.useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const sendMessage = React.useCallback(
    (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || !activeConversation) return;

      const conversationId = activeConversation.id;
      const now = new Date().toISOString();

      const userMessage: ChatMessage = {
        id: `msg-${crypto.randomUUID()}`,
        role: "user",
        content: trimmed,
        createdAt: now,
        status: "complete",
      };
      dispatch({ type: "ADD_USER_MESSAGE", conversationId, message: userMessage });

      const assistantMessage: ChatMessage = {
        id: `msg-${crypto.randomUUID()}`,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        status: "streaming",
      };
      dispatch({ type: "START_ASSISTANT_MESSAGE", conversationId, message: assistantMessage });
      dispatch({ type: "SET_PRESENCE", presence: "thinking" });
      setIsGenerating(true);

      const controller = new AbortController();
      abortRef.current = controller;

      const history: OllamaChatMessage[] = [
        ...activeConversation.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        { role: "user", content: trimmed },
      ];

      void streamChat(
        { model: OLLAMA_MODEL, messages: history },
        {
          onToken: (token) => {
            dispatch({
              type: "APPEND_TOKEN",
              conversationId,
              messageId: assistantMessage.id,
              token,
            });
          },
          onDone: () => {
            dispatch({
              type: "COMPLETE_MESSAGE",
              conversationId,
              messageId: assistantMessage.id,
              status: "complete",
            });
            dispatch({ type: "SET_PRESENCE", presence: "idle" });
            setIsGenerating(false);
            abortRef.current = null;
          },
          onError: () => {
            dispatch({
              type: "COMPLETE_MESSAGE",
              conversationId,
              messageId: assistantMessage.id,
              status: "error",
            });
            dispatch({ type: "SET_PRESENCE", presence: "idle" });
            setIsGenerating(false);
            abortRef.current = null;
          },
        },
        controller.signal,
      );
    },
    [activeConversation],
  );

  const value: ChatContextValue = {
    conversations: state.conversations,
    activeConversation,
    presence: state.presence,
    profile: AI_PROFILE,
    selectConversation,
    createConversation,
    deleteConversation,
    sendMessage,
    stopGenerating,
    isGenerating,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChatContext() {
  const ctx = React.useContext(ChatContext);
  if (!ctx) throw new Error("useChatContext must be used within a ChatProvider");
  return ctx;
}
