"use client";

import * as React from "react";

import { isAbortError, transcribeAudio } from "@/lib/whisper";
import type { MicState } from "@/types/ai";

const MIC_DENIED_MESSAGE = "マイクへのアクセスが許可されていません";
const RECORDER_UNSUPPORTED_MESSAGE = "このブラウザは音声録音に対応していません";
const RECORD_FAILED_MESSAGE = "録音に失敗しました";
const EMPTY_TRANSCRIPT_MESSAGE = "音声を認識できませんでした。";
const INSECURE_CONTEXT_MESSAGE =
  "マイクを使うには http://localhost または HTTPS で開いてください。";

const PREFERRED_AUDIO_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/ogg",
  "audio/mp4",
];

function isVoiceRecordingSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function"
  );
}

function pickSupportedAudioMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return PREFERRED_AUDIO_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function isPermissionDenied(error: unknown): boolean {
  if (!(error instanceof DOMException) && !(error instanceof Error)) return false;
  return error.name === "NotAllowedError" || error.name === "PermissionDeniedError";
}

function getInitialMicState(): MicState {
  if (typeof window === "undefined") return "idle";
  return isVoiceRecordingSupported() ? "idle" : "unavailable";
}

export interface UseVoiceRecorderOptions {
  onTranscript: (text: string) => void;
}

export interface UseVoiceRecorderResult {
  state: MicState;
  error: string | null;
  isBusy: boolean;
  toggle: () => void;
}

export function useVoiceRecorder({ onTranscript }: UseVoiceRecorderOptions): UseVoiceRecorderResult {
  const [state, setState] = React.useState<MicState>(getInitialMicState);
  const [error, setError] = React.useState<string | null>(null);

  const onTranscriptRef = React.useRef(onTranscript);
  React.useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const streamRef = React.useRef<MediaStream | null>(null);
  const mimeTypeRef = React.useRef("audio/webm");
  const abortRef = React.useRef<AbortController | null>(null);
  const cancelledRef = React.useRef(false);

  const resetCapture = React.useCallback(() => {
    stopStream(streamRef.current);
    streamRef.current = null;
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, []);

  const finalizeRecording = React.useCallback(async () => {
    const chunks = chunksRef.current;
    const mimeType = mimeTypeRef.current || "audio/webm";
    resetCapture();

    if (cancelledRef.current) return;

    if (chunks.length === 0) {
      setError(RECORD_FAILED_MESSAGE);
      setState("idle");
      return;
    }

    const blob = new Blob(chunks, { type: mimeType });
    if (blob.size === 0) {
      setError(RECORD_FAILED_MESSAGE);
      setState("idle");
      return;
    }

    setState("processing");
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const text = await transcribeAudio(blob, controller.signal);
      if (cancelledRef.current) return;

      const trimmed = text.trim();
      if (!trimmed) {
        setError(EMPTY_TRANSCRIPT_MESSAGE);
        setState("idle");
        return;
      }

      onTranscriptRef.current(trimmed);
      setError(null);
      setState("idle");
    } catch (err) {
      if (cancelledRef.current || isAbortError(err)) {
        if (!cancelledRef.current) setState("idle");
        return;
      }
      console.error("[voice] transcription failed", err);
      setError(err instanceof Error ? err.message : "音声認識に失敗しました。");
      setState("idle");
    } finally {
      abortRef.current = null;
    }
  }, [resetCapture]);

  const startRecording = React.useCallback(async () => {
    setError(null);

    if (!isVoiceRecordingSupported()) {
      setState("unavailable");
      setError(RECORDER_UNSUPPORTED_MESSAGE);
      return;
    }

    if (!window.isSecureContext) {
      setError(INSECURE_CONTEXT_MESSAGE);
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      if (cancelledRef.current) return;
      if (isPermissionDenied(err)) {
        setError(MIC_DENIED_MESSAGE);
        setState("idle");
        return;
      }
      console.error("[voice] getUserMedia failed", err);
      setError(RECORD_FAILED_MESSAGE);
      setState("idle");
      return;
    }

    if (cancelledRef.current) {
      stopStream(stream);
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];

    const mimeType = pickSupportedAudioMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    } catch (err) {
      stopStream(stream);
      streamRef.current = null;
      console.error("[voice] MediaRecorder failed", err);
      setError(RECORD_FAILED_MESSAGE);
      setState("idle");
      return;
    }

    mimeTypeRef.current = recorder.mimeType || mimeType || "audio/webm";
    mediaRecorderRef.current = recorder;

    recorder.addEventListener("dataavailable", (event: BlobEvent) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    });

    recorder.addEventListener("error", () => {
      if (cancelledRef.current) return;
      setError(RECORD_FAILED_MESSAGE);
      setState("idle");
      resetCapture();
    });

    recorder.addEventListener("stop", () => {
      void finalizeRecording();
    });

    try {
      recorder.start();
      setState("recording");
    } catch (err) {
      console.error("[voice] MediaRecorder.start failed", err);
      resetCapture();
      setError(RECORD_FAILED_MESSAGE);
      setState("idle");
    }
  }, [finalizeRecording, resetCapture]);

  const stopRecording = React.useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    setState("processing");
    recorder.stop();
  }, []);

  const toggle = React.useCallback(() => {
    if (state === "unavailable" || state === "processing") return;
    if (state === "recording") {
      stopRecording();
      return;
    }
    void startRecording();
  }, [startRecording, state, stopRecording]);

  React.useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
      abortRef.current?.abort();
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
      stopStream(streamRef.current);
      streamRef.current = null;
      mediaRecorderRef.current = null;
    };
  }, []);

  return {
    state,
    error,
    isBusy: state === "recording" || state === "processing",
    toggle,
  };
}
