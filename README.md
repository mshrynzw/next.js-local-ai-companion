# Local AI Companion

ローカルPC上で動くLLM（Ollama）と、長期間にわたって自然な会話をするための、自分専用AIコンパニオンアプリです。

チャット画面からの入力は Next.js の API Route 経由でローカルの Ollama（`myai:qwen3-8b`）に送られ、応答はストリーミング表示されます。音声認識（Whisper）・音声合成（TTS）・長期記憶は未実装です。

## 必要なもの

- [Node.js](https://nodejs.org/)（LTS 推奨）
- [pnpm](https://pnpm.io/)
- [Ollama](https://ollama.com/) がローカルで起動していること
- Ollama にモデル `myai:qwen3-8b` がインストールされていること

## Ollama の準備

1. Ollama を起動します（通常はアプリを開くか、バックグラウンドサービスとして動きます）。
2. モデルがあることを確認します。

```bash
ollama list
```

`myai:qwen3-8b` が表示されれば準備完了です。ターミナルから直接試す場合:

```bash
ollama run myai:qwen3-8b
```

Qwen3 の thinking 表示は、アプリ側で Ollama API に `think: false` を指定して無効化しています。

## 環境変数

リポジトリ直下に `.env.local` を作成し、次のように設定します（`.env.example` をコピーしても構いません）。

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=myai:qwen3-8b
```

- `.env.local` は Git に含めません。
- これらの値はサーバー側だけで使います。`NEXT_PUBLIC_` は付けないでください。
- ブラウザから `http://localhost:11434` へ直接アクセスする構成にはしていません。

## セットアップ

```bash
pnpm install
pnpm dev
```

[http://localhost:3000](http://localhost:3000) を開いてチャットしてください。

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
    api/chat/route.ts   Ollama へのプロキシ（ストリーミング）
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
    ollama.ts            クライアントの streamChat()（/api/chat へ接続）
    ollama-server.ts     サーバー専用の Ollama 設定・ストリーム処理
    mock-data.ts         UI確認用の日本語会話モックデータ
    date.ts               日時フォーマット・グルーピング
    utils.ts              cn() ヘルパー

  types/ai.ts             ChatMessage, Conversation, AIPresence などの型定義
```

## Ollama 接続の流れ

```
チャット画面
  → ChatProvider.sendMessage()
  → streamChat()（src/lib/ollama.ts）
  → POST /api/chat
  → Ollama POST /api/chat（stream: true, think: false）
  → トークンを逐次表示
```

`src/lib/ollama.ts` の `streamChat()` は `onToken` / `onDone` / `onError` と `AbortSignal` によるキャンセルを維持しています。生成中の停止ボタンは、ブラウザ → Next.js → Ollama の順に中断します。

`mockStreamChat()` は UI 単体確認用に残していますが、通常の送信では使いません。

音声入力（Whisper）・音声合成（TTS）・長期記憶については、`src/types/ai.ts` の
`AIPresence` / `MicState` 型と `src/components/chat/mic-button.tsx` が拡張の起点になります。
