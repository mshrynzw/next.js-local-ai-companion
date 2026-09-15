export const DEFAULT_VOICEPEAK_SERVER_URL = "http://127.0.0.1:8001";

export const VOICEPEAK_UNREACHABLE_MESSAGE =
  "音声合成サーバーに接続できません。voicepeak-serverが起動しているか確認してください。";

export const VOICEPEAK_FAILED_MESSAGE = "音声の生成に失敗しました。";

export function getVoicepeakConfig(): { baseUrl: string } {
  const baseUrl = (process.env.VOICEPEAK_SERVER_URL ?? DEFAULT_VOICEPEAK_SERVER_URL).replace(
    /\/$/,
    "",
  );
  return { baseUrl };
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export function isVoicepeakUnreachable(error: unknown): boolean {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function readTtsRequestText(body: unknown): string | null {
  if (!isRecord(body) || typeof body.text !== "string") return null;
  return body.text;
}

/**
 * Maps voicepeak-server FastAPI `{ detail: string }` to a user-facing error.
 * Internal paths and stack traces are not forwarded.
 */
export async function parseVoicepeakHttpError(response: Response): Promise<{
  status: number;
  error: string;
}> {
  let raw = "";
  try {
    raw = await response.text();
  } catch (error) {
    console.error("[tts] Failed to read error body", error);
  }

  let detail = "";
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isRecord(parsed) && typeof parsed.detail === "string") {
      detail = parsed.detail;
    }
  } catch {
    // Body was not JSON; ignore the raw text (may contain internals).
  }

  console.error("[tts] HTTP error", response.status, detail || response.statusText);

  const lower = detail.toLowerCase();
  if (response.status === 400 || lower.includes("empty") || lower.includes("140")) {
    return { status: 400, error: "読み上げできないテキストです。" };
  }
  if (response.status === 504 || lower.includes("timed out")) {
    return { status: 504, error: "音声の生成がタイムアウトしました。" };
  }

  const status = response.status >= 400 ? response.status : 502;
  return { status, error: VOICEPEAK_FAILED_MESSAGE };
}
