/**
 * Core domain types for the AI companion.
 *
 * These types are intentionally backend-agnostic: nothing here assumes
 * Ollama specifically, so the same shapes can later be fed by a streaming
 * fetch to Ollama's /api/chat, a WebSocket, Whisper transcripts, etc.
 * See `src/lib/ollama.ts` for the integration seam.
 */

/** Who authored a given chat message. */
export type MessageRole = "user" | "assistant" | "system";

/**
 * Lifecycle of a single message bubble. `streaming` is the state a
 * message is in while tokens are still arriving from the model, which
 * the UI already knows how to render (see ChatMessage) even though no
 * backend produces it yet.
 */
export type MessageStatus = "complete" | "streaming" | "error";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string; // ISO timestamp
  status?: MessageStatus;
  /** User-facing error when `status` is `error`. */
  error?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  pinned?: boolean;
}

/**
 * The AI's overall presence state, shown next to its name at the top of
 * the conversation and (eventually) reflected in the input area.
 *
 * - `idle`      connected and present, waiting ("Online")
 * - `listening` actively capturing voice input (future: mic is live)
 * - `thinking`  generating a response
 * - `speaking`  playing back a spoken response (future: TTS)
 * - `offline`   the local backend (Ollama) is unreachable
 */
export type AIPresence = "idle" | "listening" | "thinking" | "speaking" | "offline";

export interface AIPresenceMeta {
  label: string;
  labelJa: string;
  description: string;
}

export const AI_PRESENCE_META: Record<AIPresence, AIPresenceMeta> = {
  idle: {
    label: "Online",
    labelJa: "オンライン",
    description: "接続済み。話しかけるのを待っています。",
  },
  listening: {
    label: "Listening",
    labelJa: "聞いています",
    description: "音声入力を受け取っています。",
  },
  thinking: {
    label: "Thinking",
    labelJa: "考えています",
    description: "返答を生成しています。",
  },
  speaking: {
    label: "Speaking",
    labelJa: "話しています",
    description: "音声で応答を再生しています。",
  },
  offline: {
    label: "Offline",
    labelJa: "オフライン",
    description: "ローカルのAIバックエンドに接続できません。",
  },
};

/** Future states for the microphone / voice-input control. */
export type MicState = "idle" | "recording" | "processing" | "unavailable";

/**
 * UI-facing companion profile. Display name comes from
 * `src/lib/companion.ts`. Conversation style lives in `src/lib/persona.ts`
 * and is not required to match this name.
 */
export interface AICompanionProfile {
  name: string;
  model: string;
  avatarInitial: string;
}
