import type { AICompanionProfile, ChatMessage, Conversation } from "@/types/ai";

/**
 * Mock data for UI development only. Nothing here talks to Ollama --
 * see `src/lib/ollama.ts` for where real responses will be wired in,
 * and `src/components/providers/chat-provider.tsx` for the state that
 * will eventually be backed by a real conversation store.
 *
 * Timestamps are anchored to a fixed instant (`MOCK_NOW`) rather than
 * `Date.now()`. Server-side rendering and client hydration each
 * evaluate this module independently; if timestamps were derived from
 * the real clock at import time, the two environments would compute
 * slightly different values and React would report a hydration
 * mismatch on every message time shown. A fixed anchor keeps seed data
 * perfectly deterministic. Messages sent during a real session use the
 * actual current time (see chat-provider.tsx) since those are only
 * ever created client-side, after mount.
 */

export const AI_PROFILE: AICompanionProfile = {
  name: "Lumi",
  model: "myai:qwen3-8b",
  avatarInitial: "L",
};

const MIN = 60 * 1000;
const HOUR_MIN = 60;
const DAY_MIN = 24 * HOUR_MIN;

const MOCK_NOW = new Date("2026-09-12T09:08:00.000Z").getTime();

function at(minutesAgo: number): string {
  return new Date(MOCK_NOW - minutesAgo * MIN).toISOString();
}

function thread(
  entries: Array<{ role: ChatMessage["role"]; content: string; minutesAgo: number }>,
  idPrefix: string,
): ChatMessage[] {
  return entries.map((entry, index) => ({
    id: `${idPrefix}-${index + 1}`,
    role: entry.role,
    content: entry.content,
    createdAt: at(entry.minutesAgo),
    status: "complete",
  }));
}

// --- Today: active conversation -------------------------------------------
const todayMainMessages = thread(
  [
    { role: "user", content: "最近ちょっと疲れてるんだよね。", minutesAgo: 8 },
    {
      role: "assistant",
      content:
        "そっか。最近ちょっと頑張りすぎてたのかもね。\n今日はあまり無理しないで、ゆっくり過ごそうよ。",
      minutesAgo: 7,
    },
    {
      role: "user",
      content: "そうしたいけど、明日までに終わらせないといけない資料があって…",
      minutesAgo: 6,
    },
    {
      role: "assistant",
      content:
        "それは気が重いね。ちょっとだけ肩の力を抜くために、5分だけ休憩してから始めるのはどう?\n\n- 温かい飲み物を用意する\n- 軽くストレッチする\n- 深呼吸を3回\n\nこれだけでも頭がすっきりすることが多いよ。",
      minutesAgo: 5,
    },
    { role: "user", content: "たしかに。ちょっとコーヒー淹れてくる。", minutesAgo: 4 },
    {
      role: "assistant",
      content: "いってらっしゃい。戻ってきたら資料の内容、一緒に整理しようか。",
      minutesAgo: 3,
    },
    { role: "user", content: "うん、お願い。まずは構成だけざっくり考えたい。", minutesAgo: 2 },
    {
      role: "assistant",
      content: "了解。じゃあ資料のゴールから聞かせて。誰に、何を伝えたいのか教えて。",
      minutesAgo: 1,
    },
  ],
  "msg-today-main",
);

// --- Today: earlier conversation -------------------------------------------
const todayMorningMessages = thread(
  [
    { role: "user", content: "おはよう。", minutesAgo: 9 * HOUR_MIN + 3 },
    { role: "assistant", content: "おはよう。今日もよく眠れた?", minutesAgo: 9 * HOUR_MIN + 2 },
    {
      role: "user",
      content: "まあまあかな。今日は天気いいみたいだね。",
      minutesAgo: 9 * HOUR_MIN + 1,
    },
    {
      role: "assistant",
      content: "だね。たまには窓開けて換気するといいかも。",
      minutesAgo: 9 * HOUR_MIN,
    },
  ],
  "msg-today-morning",
);

// --- Yesterday ---------------------------------------------------------------
const yesterdayBookMessages = thread(
  [
    {
      role: "user",
      content: "最近読む本探してるんだけど、何かおすすめある?",
      minutesAgo: DAY_MIN + 4 * HOUR_MIN + 6,
    },
    {
      role: "assistant",
      content:
        "いいね。どんな気分で読みたい? がっつり物語に浸りたい系か、軽く読めるエッセイ系か。",
      minutesAgo: DAY_MIN + 4 * HOUR_MIN + 5,
    },
    {
      role: "user",
      content: "軽めがいいかな。移動中に読みたいから。",
      minutesAgo: DAY_MIN + 4 * HOUR_MIN + 4,
    },
    {
      role: "assistant",
      content:
        "それなら短編集とかエッセイが合いそう。例えばこんな感じ:\n\n1. 短めの連作短編集\n2. 日常を綴ったエッセイ\n3. 写真多めの紀行文\n\nどのジャンルが気分に近い?",
      minutesAgo: DAY_MIN + 4 * HOUR_MIN + 3,
    },
    { role: "user", content: "エッセイ気分かも。", minutesAgo: DAY_MIN + 4 * HOUR_MIN + 2 },
    {
      role: "assistant",
      content: "了解。今度、静かな雰囲気のエッセイを何冊か思い出しておくね。",
      minutesAgo: DAY_MIN + 4 * HOUR_MIN + 1,
    },
  ],
  "msg-yesterday-book",
);

// --- Previous 7 days -----------------------------------------------------
const codingScriptMessages = thread(
  [
    {
      role: "user",
      content: "Downloadsフォルダの中身、拡張子ごとに整理したいんだけど。",
      minutesAgo: 3 * DAY_MIN + 5,
    },
    {
      role: "assistant",
      content:
        'いいね、簡単なPythonスクリプトでできるよ。こんな感じでどう?\n\n```python\nimport shutil\nfrom pathlib import Path\n\ndownloads = Path.home() / "Downloads"\n\nfor file in downloads.iterdir():\n    if file.is_file():\n        folder = downloads / file.suffix.lstrip(".").lower()\n        folder.mkdir(exist_ok=True)\n        shutil.move(str(file), folder / file.name)\n```\n\n拡張子ごとにサブフォルダを作って移動するだけのシンプルな内容だよ。',
      minutesAgo: 3 * DAY_MIN + 4,
    },
    {
      role: "user",
      content: "おお、これなら分かりやすい。ありがとう。",
      minutesAgo: 3 * DAY_MIN + 3,
    },
    {
      role: "assistant",
      content: "どういたしまして。実行する前に、一度バックアップを取っておくと安心だよ。",
      minutesAgo: 3 * DAY_MIN + 2,
    },
  ],
  "msg-coding",
);

const hometownMessages = thread(
  [
    {
      role: "user",
      content: "そういえば、実家の近くの川、最近工事してるらしい。",
      minutesAgo: 6 * DAY_MIN + 4,
    },
    { role: "assistant", content: "そうなんだ。よく行ってた場所?", minutesAgo: 6 * DAY_MIN + 3 },
    { role: "user", content: "うん、小さい頃よく釣りしてた。", minutesAgo: 6 * DAY_MIN + 2 },
    {
      role: "assistant",
      content: "いい思い出だね。工事が終わったら、久しぶりに帰ったとき見に行ってみたら?",
      minutesAgo: 6 * DAY_MIN + 1,
    },
  ],
  "msg-hometown",
);

const weekendMealMessages = thread(
  [
    { role: "user", content: "週末、何か簡単に作れる献立ある?", minutesAgo: 2 * DAY_MIN + 3 },
    {
      role: "assistant",
      content:
        "あるよ。疲れてる週末なら、材料少なめのものがいいよね。\n\n- 具だくさん味噌汁\n- 鮭の塩焼き\n- 冷奴\n\nこれくらいなら、すぐ用意できると思う。",
      minutesAgo: 2 * DAY_MIN + 2,
    },
    { role: "user", content: "いいね、それにしよう。", minutesAgo: 2 * DAY_MIN + 1 },
    { role: "assistant", content: "ゆっくり過ごしてね。", minutesAgo: 2 * DAY_MIN },
  ],
  "msg-weekend",
);

function lastUpdated(messages: ChatMessage[]): string {
  return messages[messages.length - 1]?.createdAt ?? new Date(MOCK_NOW).toISOString();
}

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: "conv-today-main",
    title: "最近ちょっと疲れてる",
    messages: todayMainMessages,
    createdAt: todayMainMessages[0].createdAt,
    updatedAt: lastUpdated(todayMainMessages),
  },
  {
    id: "conv-today-morning",
    title: "おはようの挨拶",
    messages: todayMorningMessages,
    createdAt: todayMorningMessages[0].createdAt,
    updatedAt: lastUpdated(todayMorningMessages),
  },
  {
    id: "conv-yesterday-book",
    title: "面白い本を教えて",
    messages: yesterdayBookMessages,
    createdAt: yesterdayBookMessages[0].createdAt,
    updatedAt: lastUpdated(yesterdayBookMessages),
  },
  {
    id: "conv-coding-script",
    title: "ファイル整理スクリプト",
    messages: codingScriptMessages,
    createdAt: codingScriptMessages[0].createdAt,
    updatedAt: lastUpdated(codingScriptMessages),
  },
  {
    id: "conv-weekend-meal",
    title: "週末の献立",
    messages: weekendMealMessages,
    createdAt: weekendMealMessages[0].createdAt,
    updatedAt: lastUpdated(weekendMealMessages),
  },
  {
    id: "conv-hometown",
    title: "実家の話",
    messages: hometownMessages,
    createdAt: hometownMessages[0].createdAt,
    updatedAt: lastUpdated(hometownMessages),
  },
];

export const DEFAULT_CONVERSATION_ID = MOCK_CONVERSATIONS[0].id;
