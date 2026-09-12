/**
 * Ollama integration seam.
 * =========================================================================
 * Nothing in this file talks to a real Ollama server yet -- `streamChat`
 * below returns a mocked, believable stream so the rest of the UI
 * (message bubbles, the "thinking" indicator, token-by-token rendering,
 * abort/interrupt handling) can already be built and exercised against
 * realistic behavior.
 *
 * When you're ready to connect the real backend, replace the body of
 * `streamChat` with a call to Ollama's streaming chat endpoint. Ollama
 * exposes `/api/chat` and responds with newline-delimited JSON, one line
 * per generated token/chunk, e.g.:
 *
 *   POST http://localhost:11434/api/chat
 *   { "model": "myai:qwen3-8b", "messages": [...], "stream": true }
 *
 *   -> {"message":{"role":"assistant","content":"こん"},"done":false}
 *   -> {"message":{"role":"assistant","content":"にちは"},"done":false}
 *   -> {"done":true, ...}
 *
 * A real implementation reads `response.body` with a `ReadableStream`
 * reader, splits on newlines, `JSON.parse`s each line, and calls
 * `onToken(line.message.content)` until `line.done === true`. The
 * `signal` parameter should be forwarded to `fetch` so an in-flight
 * generation can be cancelled -- this is the same hook that will later
 * let a voice interruption ("barge-in") cut a spoken response short.
 *
 * See: https://github.com/ollama/ollama/blob/main/docs/api.md#generate-a-chat-completion
 */

export const OLLAMA_BASE_URL =
  process.env.NEXT_PUBLIC_OLLAMA_BASE_URL ?? "http://localhost:11434";

export const OLLAMA_MODEL = process.env.NEXT_PUBLIC_OLLAMA_MODEL ?? "myai:qwen3-8b";

export interface OllamaChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OllamaChatRequest {
  model: string;
  messages: OllamaChatMessage[];
  options?: {
    temperature?: number;
  };
}

export interface StreamChatCallbacks {
  onToken: (token: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: Error) => void;
}

/**
 * Streams a chat response. Currently backed by a local mock; the public
 * signature is what a real Ollama-backed implementation should keep, so
 * callers (see `src/hooks/use-chat.ts`) never need to change.
 */
export async function streamChat(
  request: OllamaChatRequest,
  callbacks: StreamChatCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  return mockStreamChat(request, callbacks, signal);
}

// ---------------------------------------------------------------------------
// Mock implementation -- UI development only, delete when wiring up Ollama.
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

async function mockStreamChat(
  request: OllamaChatRequest,
  { onToken, onDone, onError }: StreamChatCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const lastUserMessage = [...request.messages].reverse().find((m) => m.role === "user");
  const reply = pickMockReply(lastUserMessage?.content ?? "");

  // Split into small chunks (a couple of characters at a time) to emulate
  // token-by-token generation without depending on a tokenizer.
  const chunks = reply.match(/[\s\S]{1,3}/g) ?? [reply];
  let full = "";

  try {
    // A brief pause before the first token models "thinking" time.
    await sleep(500 + Math.random() * 400, signal);

    for (const chunk of chunks) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      full += chunk;
      onToken(chunk);
      await sleep(18 + Math.random() * 28, signal);
    }

    onDone(full);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      // Interrupted (e.g. user sent a new message or, in the future,
      // started speaking over the AI). Resolve with whatever was
      // generated so far rather than surfacing it as a hard error.
      onDone(full);
      return;
    }
    onError(error instanceof Error ? error : new Error("Unknown streaming error"));
  }
}
