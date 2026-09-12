import { PresenceOrb } from "@/components/ai/presence-orb";

const SUGGESTIONS = [
  "今日あった出来事を話す",
  "気分転換になることを相談する",
  "ちょっとしたコードを手伝ってもらう",
];

export function EmptyState({ onSuggestion }: { onSuggestion: (text: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
      <PresenceOrb presence="idle" size="lg" />
      <div className="space-y-1">
        <p className="text-base font-medium text-foreground">何か話しかけてみて</p>
        <p className="text-sm text-muted-foreground">
          あなた専用のAIが、あなたのPCの中で待っています。
        </p>
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSuggestion(s)}
            className="rounded-full border border-border bg-card px-3.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
