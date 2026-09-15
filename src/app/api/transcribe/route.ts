import {
  filenameForAudioType,
  getWhisperConfig,
  isAbortError,
  isWhisperUnreachable,
  parseTranscriptionResponse,
  parseWhisperHttpError,
  WHISPER_FAILED_MESSAGE,
  WHISPER_UNREACHABLE_MESSAGE,
} from "@/lib/whisper-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request) {
  const { baseUrl } = getWhisperConfig();

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "リクエストの形式が正しくありません。" }, { status: 400 });
  }

  const audio = formData.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) {
    return Response.json({ error: "音声ファイルを送信できませんでした。" }, { status: 400 });
  }

  const filename = filenameForAudioType(
    audio.type,
    audio instanceof File ? audio.name : undefined,
  );

  const whisperForm = new FormData();
  whisperForm.append("audio", audio, filename);

  const whisperAbort = new AbortController();
  const onClientAbort = () => whisperAbort.abort();
  request.signal.addEventListener("abort", onClientAbort);

  try {
    const whisperResponse = await fetch(`${baseUrl}/transcribe`, {
      method: "POST",
      body: whisperForm,
      signal: whisperAbort.signal,
    });

    if (!whisperResponse.ok) {
      const { status, error } = await parseWhisperHttpError(whisperResponse);
      return Response.json({ error }, { status });
    }

    let payload: unknown;
    try {
      payload = await whisperResponse.json();
    } catch (error) {
      console.error("[whisper] invalid JSON from transcribe", error);
      return Response.json({ error: WHISPER_FAILED_MESSAGE }, { status: 502 });
    }

    const parsed = parseTranscriptionResponse(payload);
    if (!parsed) {
      console.error("[whisper] unexpected transcribe payload shape");
      return Response.json({ error: WHISPER_FAILED_MESSAGE }, { status: 502 });
    }

    return Response.json({ text: parsed.text });
  } catch (error) {
    if (isAbortError(error)) {
      return new Response(null, { status: 204 });
    }

    if (isWhisperUnreachable(error)) {
      console.error("[whisper] unreachable", error);
      return Response.json({ error: WHISPER_UNREACHABLE_MESSAGE }, { status: 503 });
    }

    console.error("[whisper] unexpected error", error);
    return Response.json({ error: WHISPER_FAILED_MESSAGE }, { status: 500 });
  } finally {
    request.signal.removeEventListener("abort", onClientAbort);
  }
}
