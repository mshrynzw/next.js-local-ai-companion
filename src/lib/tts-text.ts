/**
 * Minimal cleanup so VOICEPEAK reads spoken Japanese, not Markdown markup.
 * Code-fenced answers and texts over 140 characters are skipped (Stage 7-2).
 */

export const TTS_MAX_CHARS = 140;

export type SpeechSkipReason = "empty" | "too_long" | "code";

export type SpeechPrepResult =
  | { ok: true; text: string }
  | { ok: false; reason: SpeechSkipReason };

export function speechSkipMessage(reason: SpeechSkipReason): string {
  switch (reason) {
    case "too_long":
      return "回答が長いため音声では読み上げませんでした";
    case "code":
      return "コードを含む回答のため読み上げませんでした";
    default:
      return "";
  }
}

export function prepareSpeechText(raw: string): SpeechPrepResult {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, reason: "empty" };
  if (/```/.test(trimmed)) return { ok: false, reason: "code" };

  let text = trimmed;
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  text = text.replace(/\*\*(.+?)\*\*/g, "$1");
  text = text.replace(/__(.+?)__/g, "$1");
  text = text.replace(/\*(.+?)\*/g, "$1");
  text = text.replace(/_(.+?)_/g, "$1");
  text = text.replace(/^#{1,6}\s+/gm, "");
  text = text.replace(/`([^`]+)`/g, "$1");
  text = text.replace(/\s+/g, " ").trim();

  if (!text) return { ok: false, reason: "empty" };
  if (text.length > TTS_MAX_CHARS) return { ok: false, reason: "too_long" };
  return { ok: true, text };
}
