# Local AI Companion

ローカルPC上で動くLLM（Ollama）と、長期間にわたって自然な会話をするための、自分専用AIコンパニオンアプリのフロントエンドです。

現時点ではチャットUIのみで、Ollamaへの接続・音声認識（Whisper）・音声合成（TTS）・長期記憶は未実装です。UIはこれらを将来追加しやすい構造で作られています。

## セットアップ

```bash
pnpm install
pnpm dev
```

[http://localhost:3000](http://localhost:3000) を開いてください。

## 技術スタック

- Next.js 16 (App Router, Turbopack)
- TypeScript
- Tailwind CSS v4
- shadcn/ui スタイルのコンポーネント（Radix UI プリミティブ + 独自実装、CLIは未使用）
- lucide-react

外部フォント（Google Fonts）は使用していません。サンドボックス環境やオフライン環境でもビルドが失敗しないよう、システムフォントスタックを使用しています。

## ディレクトリ構成

```
src/
  app/
    page.tsx            チャット画面（ルート）
    settings/page.tsx   設定画面
    memory/page.tsx      Memory画面
    layout.tsx           全体レイアウト（テーマ・チャット状態のProvider）
    globals.css          デザイントークン（カラー・アニメーション）

  components/
    ui/                  shadcn/ui スタイルの基本コンポーネント
    ai/                  AIの存在感を表すコンポーネント（PresenceOrb, StatusDot, PresenceBadge）
    chat/                チャット画面のコンポーネント一式
    sidebar/             サイドバー・会話履歴
    layout/              AppShell（デスクトップ/モバイルのレイアウト切り替え）
    settings/            Settings画面の各セクション
    memory/              Memory画面
    providers/           ChatProvider（会話状態）, ThemeProvider（テーマ・アクセントカラー）

  lib/
    ollama.ts            ★ Ollama接続はここに実装します（下記参照）
    mock-data.ts         UI確認用の日本語会話モックデータ
    date.ts               日時フォーマット・グルーピング
    utils.ts              cn() ヘルパー

  types/ai.ts             ChatMessage, Conversation, AIPresence などの型定義
```

## 今後Ollamaを接続する場所

`src/lib/ollama.ts` の `streamChat()` が接続ポイントです。現在は `mockStreamChat()` が
ダミーの応答をトークンごとにストリーミングしているだけですが、関数シグネチャ（`onToken` /
`onDone` / `onError` コールバックと `AbortSignal` によるキャンセル）はそのままに、中身を
Ollamaの `/api/chat`（`stream: true`）への `fetch` 呼び出しに差し替えるだけで、UI側
（`src/components/providers/chat-provider.tsx` の `sendMessage`）は変更不要です。

環境変数 `NEXT_PUBLIC_OLLAMA_BASE_URL` / `NEXT_PUBLIC_OLLAMA_MODEL` で接続先モデルを
指定できるようにしてあります（未設定時は `http://localhost:11434` / `myai:qwen3-8b`）。

音声入力（Whisper）・音声合成（TTS）・長期記憶についても、`src/types/ai.ts` の
`AIPresence` / `MicState` 型と `src/components/chat/mic-button.tsx` が拡張の起点になります。
