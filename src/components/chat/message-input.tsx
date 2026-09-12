"use client";

import * as React from "react";
import { ArrowUp, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { MicButton } from "./mic-button";

const MAX_HEIGHT_PX = 200;

export interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isGenerating: boolean;
  onStop: () => void;
}

export function MessageInput({ value, onChange, onSubmit, isGenerating, onStop }: MessageInputProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = React.useState(false);

  React.useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`;
  }, [value]);

  const canSend = value.trim().length > 0 && !isGenerating;

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
          <MicButton />

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
      <p className="mt-1.5 px-1 text-center text-[11px] text-muted-foreground/50">
        Enterで送信 ・ Shift+Enterで改行
      </p>
    </div>
  );
}
