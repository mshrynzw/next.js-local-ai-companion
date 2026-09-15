"use client";

import * as React from "react";
import { ArrowUp, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import { cn } from "@/lib/utils";
import type { TtsStatus } from "@/types/ai";
import { MicButton } from "./mic-button";

const MAX_HEIGHT_PX = 200;

export interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isGenerating: boolean;
  onStop: () => void;
  ttsNotice?: string | null;
  ttsStatus?: TtsStatus;
}

export function MessageInput({
  value,
  onChange,
  onSubmit,
  isGenerating,
  onStop,
  ttsNotice = null,
  ttsStatus = "idle",
}: MessageInputProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = React.useState(false);

  const handleTranscript = React.useCallback(
    (text: string) => {
      onChange(text);
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    },
    [onChange],
  );

  const { state: micState, error: voiceError, isBusy: isVoiceBusy, toggle: toggleMic } =
    useVoiceRecorder({ onTranscript: handleTranscript });

  React.useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`;
  }, [value]);

  const canSend = value.trim().length > 0 && !isGenerating && !isVoiceBusy;

  const handleSubmit = () => {
    if (!canSend) return;
    onSubmit();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      handleSubmit();
    }
  };

  let hint = "Enterで送信 ・ Shift+Enterで改行";
  if (micState === "recording") {
    hint = "録音中 — もう一度マイクボタンを押すと停止します";
  } else if (micState === "processing") {
    hint = "文字起こし中…";
  } else if (ttsNotice) {
    hint = ttsNotice;
  }

  const hintIsError = Boolean(voiceError) || ttsStatus === "error";

  return (
    <div className="border-t border-border/70 bg-background px-4 pb-4 pt-3 sm:px-6">
      <div
        className={cn(
          "flex items-end gap-2 rounded-2xl border border-input bg-card px-3 py-2.5 shadow-sm transition-colors",
          isFocused && "border-ring ring-2 ring-ring/30",
        )}
      >
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="メッセージを入力…"
          rows={1}
          aria-label="メッセージ入力"
          className="max-h-[200px] min-h-6 flex-1 py-1 scrollbar-thin"
        />

        <div className="flex shrink-0 items-center gap-1">
          <MicButton state={micState} onToggle={toggleMic} />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                onClick={isGenerating ? onStop : handleSubmit}
                disabled={!isGenerating && !canSend}
                aria-label={isGenerating ? "生成を停止" : "送信"}
                className="rounded-full"
              >
                {isGenerating ? <Square className="size-3.5 fill-current" /> : <ArrowUp className="size-4.5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isGenerating ? "停止" : "送信 (Enter)"}</TooltipContent>
          </Tooltip>
        </div>
      </div>
      <p
        className={cn(
          "mt-1.5 px-1 text-center text-[11px]",
          hintIsError ? "text-destructive" : "text-muted-foreground/50",
        )}
        role="status"
        aria-live="polite"
      >
        {voiceError ?? hint}
      </p>
    </div>
  );
}
