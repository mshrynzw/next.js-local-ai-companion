export function TypingIndicator() {
  return (
    <span className="inline-flex items-center gap-1 py-1" role="status" aria-label="考えています">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 rounded-full bg-muted-foreground animate-thinking-dots"
          style={{ animationDelay: `${i * 0.16}s` }}
        />
      ))}
    </span>
  );
}
