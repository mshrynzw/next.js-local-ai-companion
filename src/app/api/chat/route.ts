import {
  buildOllamaChatRequest,
  getOllamaConfig,
  isAbortError,
  isOllamaUnreachable,
  OLLAMA_UNREACHABLE_MESSAGE,
  parseOllamaHttpError,
  pipeOllamaTextStream,
  sanitizeMessages,
} from "@/lib/ollama-server";
import { applyPersonaToMessages } from "@/lib/persona";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  const { baseUrl, model } = getOllamaConfig();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "リクエストの形式が正しくありません。" }, { status: 400 });
  }

  const messages =
    typeof body === "object" && body !== null && "messages" in body
      ? sanitizeMessages((body as { messages: unknown }).messages)
      : null;

  if (!messages) {
    return Response.json({ error: "messages が必要です。" }, { status: 400 });
  }

  const ollamaMessages = applyPersonaToMessages(messages);

  const ollamaAbort = new AbortController();
  const onClientAbort = () => ollamaAbort.abort();
  request.signal.addEventListener("abort", onClientAbort);

  try {
    const ollamaResponse = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildOllamaChatRequest(model, ollamaMessages)),
      signal: ollamaAbort.signal,
    });

    if (!ollamaResponse.ok) {
      const { status, error } = await parseOllamaHttpError(ollamaResponse, model);
      return Response.json({ error }, { status });
    }

    if (!ollamaResponse.body) {
      return Response.json(
        { error: "Ollamaからストリームを取得できませんでした。" },
        { status: 502 },
      );
    }

    const ollamaBody = ollamaResponse.body;

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          await pipeOllamaTextStream(ollamaBody, controller);
          controller.close();
        } catch (error) {
          if (isAbortError(error)) {
            controller.close();
            return;
          }
          console.error("[ollama] stream failed", error);
          controller.error(error);
        }
      },
      cancel() {
        ollamaAbort.abort();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    if (isAbortError(error)) {
      return new Response(null, { status: 204 });
    }

    if (isOllamaUnreachable(error)) {
      console.error("[ollama] unreachable", error);
      return Response.json({ error: OLLAMA_UNREACHABLE_MESSAGE }, { status: 503 });
    }

    console.error("[ollama] unexpected error", error);
    return Response.json(
      { error: "Ollamaとの通信中にエラーが発生しました。" },
      { status: 500 },
    );
  }
}
