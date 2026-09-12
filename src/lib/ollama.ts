/**
 * Client-side Ollama integration seam.
 *
 * This module is imported by Client Components. It must not read
 * `OLLAMA_BASE_URL` / `OLLAMA_MODEL` — those live on the server and are
 * used by `src/app/api/chat/route.ts` when talking to Ollama.
 *
 * Flow:
 *   ChatProvider → streamChat() → POST /api/chat → Ollama /api/chat
 */

export interface OllamaChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OllamaChatRequest {
  model?: string;
  messages: OllamaChatMessage[];
  stream?: boolean;
  think?: boolean;
  options?: {
    temperature?: number;
  };
}

export interface OllamaChatResponse {
  model?: string;
  message?: {
    role?: string;
    content?: string;
  };
  done?: boolean;
  error?: string;
}

export interface StreamChatCallbacks {
  onToken: (token: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: Error) => void;
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

/**
 * Streams a chat response from the Next.js API route (which proxies Ollama).
 * Callers (see `src/components/providers/chat-provider.tsx`) stay unchanged
 * aside from not supplying a client-side model env var.
 */
export async function streamChat(
  request: OllamaChatRequest,
  callbacks: StreamChatCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  return streamChatFromApi(request, callbacks, signal);
}

async function streamChatFromApi(
  request: OllamaChatRequest,
  { onToken, onDone, onError }: StreamChatCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  let full = "";

  try {
    if (signal?.aborted) {
      onDone(full);
      return;
    }

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: request.messages }),
      cache: "no-store",
      signal,
    });

    if (!response.ok) {
      onError(new Error(await readApiError(response)));
      return;
    }

    if (!response.body) {
      onError(new Error("応答ストリームを取得できませんでした。"));
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      if (chunk) {
        full += chunk;
        onToken(chunk);
      }
    }

    onDone(full);
  } catch (error) {
    if (isAbortError(error)) {
      onDone(full);
      return;
    }
    console.error("[ollama] streamChat failed", error);
    onError(error instanceof Error ? error : new Error("Unknown streaming error"));
  }
}

async function readApiError(response: Response): Promise<string> {
  try {
    const data: unknown = await response.json();
    if (
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof (data as { error: unknown }).error === "string"
    ) {
      return (data as { error: string }).error;
    }
  } catch {
    // Fall through to a generic status message.
  }
  return `サーバーエラーが発生しました（HTTP ${response.status}）。`;
}

// ---------------------------------------------------------------------------
// Mock implementation -- kept for isolated UI work. Not used by streamChat.
// ---------------------------------------------------------------------------

const COMFORT_REPLY =
  "うん、無理しなくて大丈夫だよ。\n\n少し立ち止まって、深呼吸してみようか。ゆっくりでいいから、話したいことがあれば聞かせてね。";

const CODE_REPLY =
  "こういう感じでどうかな。\n\n```ts\nfunction greet(name: string) {\n  return `こんにちは、${name}さん`;\n}\n```\n\n必要なら、もう少し用途に合わせて調整するよ。";

const GENERIC_REPLIES = [
  "なるほどね。もう少し詳しく聞かせてもらってもいい?",
  "そっか、それは気になるね。一緒に整理してみようか。",
  "うんうん、聞いてるよ。それでどうなったの?",
  "いいと思う。無理のない範囲で進めていこう。",
];

function pickMockReply(userText: string): string {
  if (/疲れ|しんどい|つらい|眠い/.test(userText)) return COMFORT_REPLY;
  if (/コード|スクリプト|関数|バグ|プログラム/.test(userText)) return CODE_REPLY;
  return GENERIC_REPLIES[Math.floor(Math.random() * GENERIC_REPLIES.length)];
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

export async function mockStreamChat(
  request: OllamaChatRequest,
  { onToken, onDone, onError }: StreamChatCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const lastUserMessage = [...request.messages].reverse().find((m) => m.role === "user");
  const reply = pickMockReply(lastUserMessage?.content ?? "");

  const chunks = reply.match(/[\s\S]{1,3}/g) ?? [reply];
  let full = "";

  try {
    await sleep(500 + Math.random() * 400, signal);

    for (const chunk of chunks) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      full += chunk;
      onToken(chunk);
      await sleep(18 + Math.random() * 28, signal);
    }

    onDone(full);
  } catch (error) {
    if (isAbortError(error)) {
      onDone(full);
      return;
    }
    onError(error instanceof Error ? error : new Error("Unknown streaming error"));
  }
}
