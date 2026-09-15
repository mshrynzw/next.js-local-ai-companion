"use client";

import { Loader2, Mic, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { MicState } from "@/types/ai";

export interface MicButtonProps {
  state: MicState;
  onToggle: () => void;
  disabled?: boolean;
}

function labelForState(state: MicState): { aria: string; tooltip: string } {
  switch (state) {
    case "recording":
      return { aria: "音声入力を停止", tooltip: "聞いています…" };
    case "processing":
      return { aria: "文字起こし中", tooltip: "文字起こし中…" };
    case "unavailable":
      return {
        aria: "音声入力は利用できません",
        tooltip: "このブラウザでは音声入力を利用できません",
      };
    default:
      return { aria: "音声入力を開始", tooltip: "音声入力" };
  }
}

/**
 * Toggles browser microphone capture. Recording uses MediaRecorder;
 * transcription is handled by the parent via `useVoiceRecorder`.
 */
export function MicButton({ state, onToggle, disabled = false }: MicButtonProps) {
  const isRecording = state === "recording";
  const isProcessing = state === "processing";
  const isUnavailable = state === "unavailable";
  const labels = labelForState(state);
  const isDisabled = disabled || isUnavailable || isProcessing;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onToggle}
          disabled={isDisabled}
          aria-pressed={isRecording}
          aria-busy={isProcessing}
          aria-label={labels.aria}
          className={cn(
            "relative shrink-0 rounded-full text-muted-foreground hover:text-foreground",
            isRecording && "text-status-listening hover:text-status-listening",
            isProcessing && "text-status-thinking hover:text-status-thinking",
          )}
        >
          {isRecording && (
            <span className="absolute inline-flex size-full animate-pulse-ring rounded-full bg-status-listening/60" />
          )}
          {isProcessing ? (
            <Loader2 className="size-4.5 animate-spin" />
          ) : isRecording ? (
            <Square className="size-4 fill-current" />
          ) : (
            <Mic className="size-4.5" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{labels.tooltip}</TooltipContent>
    </Tooltip>
  );
}
