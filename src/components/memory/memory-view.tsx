"use client";

import * as React from "react";
import { CalendarClock, Heart, NotebookText, Sparkles } from "lucide-react";

import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { MemoryCategoryCard } from "./memory-category-card";

const CATEGORIES = [
  {
    icon: Heart,
    title: "好み",
    description: "好きなもの・苦手なものなど、あなたの好みを覚えておきます。",
  },
  {
    icon: CalendarClock,
    title: "出来事",
    description: "会話の中で共有された、大事な出来事や予定を記録します。",
  },
  {
    icon: NotebookText,
    title: "長期的な情報",
    description: "名前や習慣など、長く覚えておいてほしい情報です。",
  },
];

export function MemoryView() {
  const [enabled, setEnabled] = React.useState(false);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-border/70 px-4 py-4 sm:px-6">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Memory</h1>
          <p className="text-sm text-muted-foreground">AIが覚えていることを、ここで確認・管理できます。</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="memory-toggle" checked={enabled} onCheckedChange={setEnabled} />
          <Label htmlFor="memory-toggle" className="text-sm text-muted-foreground">
            {enabled ? "有効" : "無効"}
          </Label>
        </div>
      </header>

      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-border bg-card/60 p-4">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="text-sm text-muted-foreground">
              長期記憶は現在準備中の機能です。有効にすると、会話から自動的に覚えておくべき内容を抽出し、
              次に話すときにも参照できるようになる予定です。
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((category) => (
              <MemoryCategoryCard key={category.title} {...category} />
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
