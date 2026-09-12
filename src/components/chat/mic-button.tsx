"use client";

import * as React from "react";
import { Mic, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { MicState } from "@/types/ai";

/**
 * Stands in for the future voice-input control. There is no real audio
 * capture yet (that's Whisper's job, see the project README), but the
 * interaction and visual states -- idle / recording -- are wired up now
 * so swapping in real `getUserMedia` + Whisper streaming later only
 * touches this component.
 */
export function MicButton() {
  const [state, setState] = React.useState<MicState>("idle");
  const isRecording = state === "recording";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setState(isRecording ? "idle" : "recording")}
          aria-pressed={isRecording}
          aria-label={isRecording ? "音声入力を停止" : "音声入力を開始（開発予定）"}
          className={cn(
            "relative shrink-0 rounded-full text-muted-foreground hover:text-foreground",
            isRecording && "text-status-listening hover:text-status-listening",
          )}
        >
          {isRecording && (
            <span className="absolute inline-flex size-full animate-pulse-ring rounded-full bg-status-listening/60" />
          )}
          {isRecording ? <Square className="size-4 fill-current" /> : <Mic className="size-4.5" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {isRecording ? "聞いています…" : "音声入力（近日対応予定）"}
      </TooltipContent>
    </Tooltip>
  );
}
