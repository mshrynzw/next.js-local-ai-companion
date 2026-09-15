/**
 * Client-side Whisper integration seam.
 *
 * This module is imported by Client Components. It must not read
 * `WHISPER_SERVER_URL` — that lives on the server and is used by
 * `src/app/api/transcribe/route.ts` when talking to faster-whisper-server.
 *
 * Flow:
 *   useVoiceRecorder → transcribeAudio() → POST /api/transcribe
 *     → faster-whisper-server POST /transcribe
 */

import type { TranscriptionResponse } from "@/types/ai";

export class TranscriptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TranscriptionError";
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export function filenameForAudioBlob(blob: Blob): string {
  const type = blob.type.toLowerCase();
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

function readApiError(data: unknown, status: number): string {
  if (isRecord(data) && typeof data.error === "string" && data.error.trim()) {
    return data.error;
  }
  return `音声認識に失敗しました（HTTP ${status}）。`;
}

function parseTranscriptionResponse(data: unknown): TranscriptionResponse | null {
  if (!isRecord(data) || typeof data.text !== "string") return null;
  return { text: data.text };
}

/**
 * Sends a recorded audio Blob to the Next.js API route (which proxies
 * faster-whisper-server). Callers must not fetch the Whisper server URL
 * from the browser.
 */
export async function transcribeAudio(blob: Blob, signal?: AbortSignal): Promise<string> {
  const formData = new FormData();
  formData.append("audio", blob, filenameForAudioBlob(blob));

  let response: Response;
  try {
    response = await fetch("/api/transcribe", {
      method: "POST",
      body: formData,
      cache: "no-store",
      signal,
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    console.error("[whisper] transcribeAudio failed", error);
    throw new TranscriptionError(
      "音声認識サーバーに接続できません。faster-whisper-serverが起動しているか確認してください。",
    );
  }

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new TranscriptionError(readApiError(data, response.status));
  }

  const parsed = parseTranscriptionResponse(data);
  if (!parsed) {
    throw new TranscriptionError("音声認識の応答形式が正しくありません。");
  }

  return parsed.text;
}
