"use client";

import * as React from "react";

import { AI_PROFILE, DEFAULT_CONVERSATION_ID, MOCK_CONVERSATIONS } from "@/lib/mock-data";
import { streamChat, type OllamaChatMessage } from "@/lib/ollama";
import { playSpeechBlob, stopSpeechPlayback, unlockSpeechPlayback } from "@/lib/speech-playback";
import { prepareSpeechText, speechSkipMessage } from "@/lib/tts-text";
import { isAbortError, synthesizeSpeech } from "@/lib/voicepeak";
import type {
  AICompanionProfile,
  AIPresence,
  ChatMessage,
  Conversation,
  TtsStatus,
} from "@/types/ai";

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
      error?: string;
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
              m.id === action.messageId
                ? { ...m, status: action.status, error: action.error }
                : m,
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
  ttsStatus: TtsStatus;
  ttsNotice: string | null;
  speakingMessageId: string | null;
  speakMessage: (messageId: string) => void;
}

const ChatContext = React.createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(reducer, {
    conversations: MOCK_CONVERSATIONS,
    activeConversationId: DEFAULT_CONVERSATION_ID,
    presence: "idle",
  });

  const abortRef = React.useRef<AbortController | null>(null);
  const ttsAbortRef = React.useRef<AbortController | null>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [ttsStatus, setTtsStatus] = React.useState<TtsStatus>("idle");
  const [ttsNotice, setTtsNotice] = React.useState<string | null>(null);
  const [speakingMessageId, setSpeakingMessageId] = React.useState<string | null>(null);

  const activeConversation = state.conversations.find((c) => c.id === state.activeConversationId);

  const stopSpeech = React.useCallback(() => {
    ttsAbortRef.current?.abort();
    ttsAbortRef.current = null;
    stopSpeechPlayback();
    setSpeakingMessageId(null);
    setTtsStatus("idle");
    setTtsNotice(null);
  }, []);

  const speakAssistantText = React.useCallback(
    async (rawText: string, messageId: string) => {
      const prepared = prepareSpeechText(rawText);
      if (!prepared.ok) {
        const notice = speechSkipMessage(prepared.reason);
        setTtsStatus(prepared.reason === "empty" ? "idle" : "skipped");
        setTtsNotice(notice || null);
        setSpeakingMessageId(null);
        dispatch({ type: "SET_PRESENCE", presence: "idle" });
        return;
      }

      const controller = new AbortController();
      ttsAbortRef.current = controller;
      setTtsStatus("generating");
      setTtsNotice("音声を生成しています…");
      setSpeakingMessageId(messageId);
      dispatch({ type: "SET_PRESENCE", presence: "speaking" });

      try {
        const blob = await synthesizeSpeech(prepared.text, controller.signal);
        if (controller.signal.aborted || ttsAbortRef.current !== controller) return;

        setTtsStatus("speaking");
        setTtsNotice("読み上げ中…");
        await playSpeechBlob(blob, controller.signal);
        if (controller.signal.aborted || ttsAbortRef.current !== controller) return;

        setTtsStatus("idle");
        setTtsNotice(null);
        setSpeakingMessageId(null);
        dispatch({ type: "SET_PRESENCE", presence: "idle" });
      } catch (error) {
        if (isAbortError(error) || controller.signal.aborted || ttsAbortRef.current !== controller) {
          return;
        }
        console.error("[tts] playback failed", error);
        setTtsStatus("error");
        setTtsNotice("音声を再生できませんでした");
        setSpeakingMessageId(null);
        dispatch({ type: "SET_PRESENCE", presence: "idle" });
      } finally {
        if (ttsAbortRef.current === controller) {
          ttsAbortRef.current = null;
        }
      }
    },
    [],
  );

  const selectConversation = React.useCallback(
    (id: string) => {
      abortRef.current?.abort();
      stopSpeech();
      dispatch({ type: "SELECT_CONVERSATION", id });
    },
    [stopSpeech],
  );

  const createConversation = React.useCallback(() => {
    abortRef.current?.abort();
    stopSpeech();
    dispatch({ type: "CREATE_CONVERSATION" });
  }, [stopSpeech]);

  const deleteConversation = React.useCallback((id: string) => {
    dispatch({ type: "DELETE_CONVERSATION", id });
  }, []);

  const stopGenerating = React.useCallback(() => {
    abortRef.current?.abort();
    stopSpeech();
    dispatch({ type: "SET_PRESENCE", presence: "idle" });
  }, [stopSpeech]);

  React.useEffect(() => {
    return () => {
      abortRef.current?.abort();
      ttsAbortRef.current?.abort();
      stopSpeechPlayback();
    };
  }, []);

  const speakMessage = React.useCallback(
    (messageId: string) => {
      const conversation = activeConversation;
      const message = conversation?.messages.find((item) => item.id === messageId);
      if (!message || message.role !== "assistant" || message.status === "error" || message.status === "streaming") {
        return;
      }
      unlockSpeechPlayback();
      stopSpeech();
      void speakAssistantText(message.content, messageId);
    },
    [activeConversation, speakAssistantText, stopSpeech],
  );

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
      unlockSpeechPlayback();
      stopSpeech();

      // user/assistant turns only. The system prompt is attached on the
      // server from `src/lib/persona.ts` (not sent by the client).
      const history: OllamaChatMessage[] = [
        ...activeConversation.messages
          .filter(
            (m) =>
              (m.role === "user" || m.role === "assistant") &&
              m.status !== "error" &&
              m.content.trim().length > 0,
          )
          .map((m) => ({
            role: m.role,
            content: m.content,
          })),
        { role: "user", content: trimmed },
      ];

      void streamChat(
        { messages: history },
        {
          onToken: (token) => {
            dispatch({
              type: "APPEND_TOKEN",
              conversationId,
              messageId: assistantMessage.id,
              token,
            });
          },
          onDone: (fullText) => {
            const aborted = controller.signal.aborted;
            dispatch({
              type: "COMPLETE_MESSAGE",
              conversationId,
              messageId: assistantMessage.id,
              status: "complete",
            });
            setIsGenerating(false);
            abortRef.current = null;

            if (aborted) {
              dispatch({ type: "SET_PRESENCE", presence: "idle" });
              return;
            }

            void speakAssistantText(fullText, assistantMessage.id);
          },
          onError: (error) => {
            console.error("[chat] generation failed:", error.message);
            dispatch({
              type: "COMPLETE_MESSAGE",
              conversationId,
              messageId: assistantMessage.id,
              status: "error",
              error: error.message,
            });
            dispatch({
              type: "SET_PRESENCE",
              presence: error.message.includes("Ollamaに接続できません") ? "offline" : "idle",
            });
            setIsGenerating(false);
            abortRef.current = null;
          },
        },
        controller.signal,
      );
    },
    [activeConversation, speakAssistantText, stopSpeech],
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
    ttsStatus,
    ttsNotice,
    speakingMessageId,
    speakMessage,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChatContext() {
  const ctx = React.useContext(ChatContext);
  if (!ctx) throw new Error("useChatContext must be used within a ChatProvider");
  return ctx;
}
