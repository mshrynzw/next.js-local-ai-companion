import type { Conversation } from "@/types/ai";

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Group label used in the sidebar's conversation history list. */
export type HistoryGroupKey = "today" | "yesterday" | "previous7" | "older";

export const HISTORY_GROUP_LABEL: Record<HistoryGroupKey, string> = {
  today: "Today",
  yesterday: "Yesterday",
  previous7: "Previous 7 days",
  older: "Older",
};

export function getHistoryGroup(isoDate: string, now: Date = new Date()): HistoryGroupKey {
  const today = startOfDay(now);
  const target = startOfDay(new Date(isoDate));
  const diffDays = Math.round((today.getTime() - target.getTime()) / DAY_MS);

  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays <= 7) return "previous7";
  return "older";
}

/** Group + order conversations for display, most-recently-updated first within each group. */
export function groupConversationsByRecency(
  conversations: Conversation[],
  now: Date = new Date(),
): Array<{ key: HistoryGroupKey; label: string; items: Conversation[] }> {
  const order: HistoryGroupKey[] = ["today", "yesterday", "previous7", "older"];
  const buckets = new Map<HistoryGroupKey, Conversation[]>();

  for (const key of order) buckets.set(key, []);

  for (const conversation of conversations) {
    const key = getHistoryGroup(conversation.updatedAt, now);
    buckets.get(key)!.push(conversation);
  }

  return order
    .map((key) => ({
      key,
      label: HISTORY_GROUP_LABEL[key],
      items: buckets.get(key)!.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
    }))
    .filter((group) => group.items.length > 0);
}

/** A short, friendly relative timestamp for message groups and previews. */
export function formatRelativeTime(isoDate: string, now: Date = new Date()): string {
  const diffMs = now.getTime() - new Date(isoDate).getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "たった今";
  if (diffMin < 60) return `${diffMin}分前`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}時間前`;

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return "昨日";
  if (diffDay < 7) return `${diffDay}日前`;

  return new Date(isoDate).toLocaleDateString("ja-JP", {
    month: "long",
    day: "numeric",
  });
}

/** Time-of-day label used inside the conversation, e.g. "14:32". */
export function formatClockTime(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
