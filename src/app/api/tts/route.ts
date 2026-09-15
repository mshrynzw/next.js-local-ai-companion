import { TTS_MAX_CHARS } from "@/lib/tts-text";
import {
  getVoicepeakConfig,
  isAbortError,
  isVoicepeakUnreachable,
  parseVoicepeakHttpError,
  readTtsRequestText,
  VOICEPEAK_FAILED_MESSAGE,
  VOICEPEAK_UNREACHABLE_MESSAGE,
} from "@/lib/voicepeak-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const SYNTHESIZE_TIMEOUT_MS = 90_000;

export async function POST(request: Request) {
  const { baseUrl } = getVoicepeakConfig();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "リクエストの形式が正しくありません。" }, { status: 400 });
  }

  const text = readTtsRequestText(body);
  if (text === null) {
    return Response.json({ error: "text が必要です。" }, { status: 400 });
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return Response.json({ error: "読み上げできないテキストです。" }, { status: 400 });
  }
  if (trimmed.length > TTS_MAX_CHARS) {
    return Response.json({ error: "読み上げできないテキストです。" }, { status: 400 });
  }

  const voicepeakAbort = new AbortController();
  const onClientAbort = () => voicepeakAbort.abort();
  request.signal.addEventListener("abort", onClientAbort);

  const timeout = setTimeout(() => voicepeakAbort.abort(), SYNTHESIZE_TIMEOUT_MS);

  try {
    const voicepeakResponse = await fetch(`${baseUrl}/synthesize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: trimmed }),
      signal: voicepeakAbort.signal,
      cache: "no-store",
    });

    if (!voicepeakResponse.ok) {
      const { status, error } = await parseVoicepeakHttpError(voicepeakResponse);
      return Response.json({ error }, { status });
    }

    const contentType = voicepeakResponse.headers.get("content-type") ?? "";
    if (!contentType.includes("audio/wav") && !contentType.includes("audio/wave")) {
      console.error("[tts] unexpected content-type from voicepeak-server", contentType);
      return Response.json({ error: VOICEPEAK_FAILED_MESSAGE }, { status: 502 });
    }

    const wav = await voicepeakResponse.arrayBuffer();
    if (wav.byteLength === 0) {
      console.error("[tts] empty WAV from voicepeak-server");
      return Response.json({ error: VOICEPEAK_FAILED_MESSAGE }, { status: 502 });
    }

    return new Response(wav, {
      headers: {
        "Content-Type": "audio/wav",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (isAbortError(error)) {
      if (request.signal.aborted) {
        return new Response(null, { status: 204 });
      }
      return Response.json({ error: "音声の生成がタイムアウトしました。" }, { status: 504 });
    }

    if (isVoicepeakUnreachable(error)) {
      console.error("[tts] unreachable", error);
      return Response.json({ error: VOICEPEAK_UNREACHABLE_MESSAGE }, { status: 503 });
    }

    console.error("[tts] unexpected error", error);
    return Response.json({ error: VOICEPEAK_FAILED_MESSAGE }, { status: 500 });
  } finally {
    clearTimeout(timeout);
    request.signal.removeEventListener("abort", onClientAbort);
  }
}
