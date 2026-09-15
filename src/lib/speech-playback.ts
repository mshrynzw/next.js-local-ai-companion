/**
 * HTMLAudioElement helper used after a user gesture (send / replay).
 * A short silent clip is played on send so later `audio.play()` is more
 * likely to succeed once Ollama streaming finishes (autoplay policy).
 */

const SILENT_WAV =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";

let audio: HTMLAudioElement | null = null;
let objectUrl: string | null = null;
let unlocked = false;

function ensureAudio(): HTMLAudioElement {
  if (!audio) audio = new Audio();
  return audio;
}

function revokeObjectUrl() {
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  }
}

export function unlockSpeechPlayback(): void {
  if (typeof window === "undefined") return;
  const el = ensureAudio();
  if (unlocked) return;
  el.src = SILENT_WAV;
  void el
    .play()
    .then(() => {
      el.pause();
      el.currentTime = 0;
      unlocked = true;
    })
    .catch(() => {
      // Gesture unlock failed; a later play() may still be blocked.
    });
}

export function stopSpeechPlayback(): void {
  if (!audio) {
    revokeObjectUrl();
    return;
  }
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
  revokeObjectUrl();
}

export async function playSpeechBlob(blob: Blob, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  stopSpeechPlayback();
  const el = ensureAudio();
  const url = URL.createObjectURL(blob);
  objectUrl = url;
  el.src = url;

  try {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    await el.play();
    await new Promise<void>((resolve, reject) => {
      const finish = (error?: Error) => {
        el.removeEventListener("ended", onEnded);
        el.removeEventListener("error", onError);
        signal?.removeEventListener("abort", onAbort);
        if (error) reject(error);
        else resolve();
      };
      const onEnded = () => finish();
      const onError = () => finish(new Error("音声の再生に失敗しました。"));
      const onAbort = () => {
        stopSpeechPlayback();
        finish(new DOMException("Aborted", "AbortError"));
      };
      el.addEventListener("ended", onEnded);
      el.addEventListener("error", onError);
      signal?.addEventListener("abort", onAbort, { once: true });
      if (signal?.aborted) onAbort();
    });
  } finally {
    if (objectUrl === url) {
      revokeObjectUrl();
    }
  }
}
