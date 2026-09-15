import type { TranscriptionResponse } from "@/types/ai";

export const DEFAULT_WHISPER_SERVER_URL = "http://127.0.0.1:8000";

export const WHISPER_UNREACHABLE_MESSAGE =
  "音声認識サーバーに接続できません。faster-whisper-serverが起動しているか確認してください。";

export const WHISPER_FAILED_MESSAGE = "音声認識に失敗しました。";

export function getWhisperConfig(): { baseUrl: string } {
  const baseUrl = (process.env.WHISPER_SERVER_URL ?? DEFAULT_WHISPER_SERVER_URL).replace(
    /\/$/,
    "",
  );
  return { baseUrl };
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export function isWhisperUnreachable(error: unknown): boolean {
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

export function filenameForAudioType(mimeType: string, originalName?: string): string {
  const fromName = originalName?.trim();
  if (fromName && /\.[a-z0-9]+$/i.test(fromName)) {
    return fromName;
  }

  const type = mimeType.toLowerCase();
  if (type.includes("wav")) return "recording.wav";
  if (type.includes("mpeg") || type.includes("mp3")) return "recording.mp3";
  if (type.includes("mp4") || type.includes("m4a") || type.includes("aac")) return "recording.m4a";
  if (type.includes("ogg")) return "recording.ogg";
  if (type.includes("flac")) return "recording.flac";
  return "recording.webm";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseTranscriptionResponse(data: unknown): TranscriptionResponse | null {
  if (!isRecord(data) || typeof data.text !== "string") return null;
  return { text: data.text };
}

/**
 * Maps faster-whisper-server's FastAPI `{ detail: { code, message } }`
 * (or a plain string `detail`) to a user-facing Japanese error.
 */
export async function parseWhisperHttpError(response: Response): Promise<{
  status: number;
  error: string;
}> {
  let raw = "";
  try {
    raw = await response.text();
  } catch (error) {
    console.error("[whisper] Failed to read error body", error);
  }

  let code = "";
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isRecord(parsed) && "detail" in parsed) {
      const detail = parsed.detail;
      if (typeof detail === "string") {
        code = detail;
      } else if (isRecord(detail)) {
        if (typeof detail.code === "string") code = detail.code;
      }
    }
  } catch {
    // Body was not JSON; ignore the raw text (may contain internals).
  }

  console.error("[whisper] HTTP error", response.status, code || response.statusText);

  if (code === "missing_audio") {
    return { status: 400, error: "音声ファイルを送信できませんでした。" };
  }
  if (code === "unsupported_audio") {
    return { status: 400, error: "この音声形式は認識できません。" };
  }

  const status = response.status >= 400 ? response.status : 502;
  return { status, error: WHISPER_FAILED_MESSAGE };
}
