/**
 * Client-side VOICEPEAK integration seam.
 *
 * This module is imported by Client Components. It must not read
 * `VOICEPEAK_SERVER_URL` — that lives on the server and is used by
 * `src/app/api/tts/route.ts` when talking to voicepeak-server.
 *
 * Flow:
 *   ChatProvider → synthesizeSpeech() → POST /api/tts
 *     → voicepeak-server POST /synthesize
 */

export class SpeechSynthesisError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpeechSynthesisError";
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readApiError(data: unknown, status: number): string {
  if (isRecord(data) && typeof data.error === "string" && data.error.trim()) {
    return data.error;
  }
  return `音声の生成に失敗しました（HTTP ${status}）。`;
}

/**
 * Sends text to the Next.js API route (which proxies voicepeak-server).
 * Callers must not fetch the VOICEPEAK server URL from the browser.
 */
export async function synthesizeSpeech(text: string, signal?: AbortSignal): Promise<Blob> {
  let response: Response;
  try {
    response = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      cache: "no-store",
      signal,
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    console.error("[tts] synthesizeSpeech failed", error);
    throw new SpeechSynthesisError(
      "音声合成サーバーに接続できません。voicepeak-serverが起動しているか確認してください。",
    );
  }

  if (!response.ok) {
    let data: unknown = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    throw new SpeechSynthesisError(readApiError(data, response.status));
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("audio/wav") && !contentType.includes("audio/wave")) {
    throw new SpeechSynthesisError("音声の応答形式が正しくありません。");
  }

  const blob = await response.blob();
  if (blob.size === 0) {
    throw new SpeechSynthesisError("音声データを取得できませんでした。");
  }

  return blob;
}
