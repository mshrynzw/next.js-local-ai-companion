import type { OllamaChatMessage, OllamaChatRequest, OllamaChatResponse } from "@/lib/ollama";

export const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434";
export const DEFAULT_OLLAMA_MODEL = "myai:qwen3-8b";

export const OLLAMA_UNREACHABLE_MESSAGE =
  "Ollamaに接続できません。Ollamaが起動しているか確認してください。";

export function getOllamaConfig(): { baseUrl: string; model: string } {
  const baseUrl = (process.env.OLLAMA_BASE_URL ?? DEFAULT_OLLAMA_BASE_URL).replace(/\/$/, "");
  const model = process.env.OLLAMA_MODEL ?? DEFAULT_OLLAMA_MODEL;
  return { baseUrl, model };
}

export function modelNotFoundMessage(model: string): string {
  return `モデル「${model}」が見つかりません。Ollamaにモデルがインストールされているか確認してください。`;
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export function isOllamaUnreachable(error: unknown): boolean {
  if (isAbortError(error)) return false;
  if (!(error instanceof Error)) return false;

  const causeMessage =
    "cause" in error && error.cause instanceof Error ? error.cause.message : "";
  const combined = `${error.message} ${causeMessage}`.toLowerCase();

  return (
    combined.includes("fetch failed") ||
    combined.includes("failed to fetch") ||
    combined.includes("econnrefused") ||
    combined.includes("enotfound") ||
    combined.includes("etimedout") ||
    combined.includes("econnreset") ||
    combined.includes("network")
  );
}

export function sanitizeMessages(input: unknown): OllamaChatMessage[] | null {
  if (!Array.isArray(input)) return null;

  const allowedRoles = new Set<OllamaChatMessage["role"]>(["system", "user", "assistant"]);
  const messages: OllamaChatMessage[] = [];

  for (const item of input) {
    if (typeof item !== "object" || item === null) continue;
    const role = "role" in item ? item.role : null;
    const content = "content" in item ? item.content : null;
    if (
      (role === "system" || role === "user" || role === "assistant") &&
      allowedRoles.has(role) &&
      typeof content === "string"
    ) {
      messages.push({ role, content });
    }
  }

  return messages;
}

export function buildOllamaChatRequest(
  model: string,
  messages: OllamaChatMessage[],
): OllamaChatRequest {
  return {
    model,
    messages,
    stream: true,
    think: false,
  };
}

export async function parseOllamaHttpError(
  response: Response,
  model: string,
): Promise<{ status: number; error: string }> {
  let raw = "";
  try {
    raw = await response.text();
  } catch (error) {
    console.error("[ollama] Failed to read error body", error);
  }

  let detail = raw;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "error" in parsed &&
      typeof (parsed as { error: unknown }).error === "string"
    ) {
      detail = (parsed as { error: string }).error;
    }
  } catch {
    // Body was not JSON; use the raw text for logging.
  }

  console.error("[ollama] HTTP error", response.status, detail);

  const lower = detail.toLowerCase();
  if (response.status === 404 || lower.includes("not found") || lower.includes("does not exist")) {
    return { status: 404, error: modelNotFoundMessage(model) };
  }

  return {
    status: response.status >= 400 ? response.status : 502,
    error: `Ollamaからの応答に失敗しました（HTTP ${response.status}）。`,
  };
}

function extractToken(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  try {
    const parsed = JSON.parse(trimmed) as OllamaChatResponse;
    if (parsed.error) {
      console.error("[ollama] stream chunk error", parsed.error);
      return null;
    }
    const content = parsed.message?.content;
    return content ? content : null;
  } catch (error) {
    console.error("[ollama] NDJSON parse error", trimmed, error);
    return null;
  }
}

export async function pipeOllamaTextStream(
  ollamaBody: ReadableStream<Uint8Array>,
  output: ReadableStreamDefaultController<Uint8Array>,
): Promise<void> {
  const reader = ollamaBody.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const token = extractToken(line);
        if (token) output.enqueue(encoder.encode(token));
      }
    }

    const leftover = extractToken(buffer);
    if (leftover) output.enqueue(encoder.encode(leftover));
  } finally {
    reader.releaseLock();
  }
}
