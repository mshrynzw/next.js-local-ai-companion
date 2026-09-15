# Local AI Companion

ローカルPC上で動くLLM（Ollama）と、長期間にわたって自然な会話をするための、自分専用AIコンパニオンアプリです。

チャット画面からの入力はブラウザから Ollama へ直接送らず、Next.js の API Route（`POST /api/chat`）経由でローカルの Ollama（既定モデル: `myai:qwen3-8b`）に送られます。応答はストリーミングで Chat UI に逐次表示されます。

音声入力はブラウザの MediaRecorder で録音し、Next.js の `POST /api/transcribe` 経由でローカルの faster-whisper-server に送ります。認識結果はチャット入力欄に入り、ユーザーが確認・編集してから送信します（自動送信しません）。ブラウザから Whisper サーバーへは直接アクセスしません。

AI の応答が完成すると、Next.js の `POST /api/tts` 経由でローカルの voicepeak-server（VOICEPEAK 1.2.23）が WAV を生成し、ブラウザで自動再生します。ブラウザから voicepeak-server へは直接アクセスしません。140 文字を超える回答やコードブロックを含む回答は、チャット表示はそのままに読み上げをスキップします。TTS が失敗してもチャット自体は成功として残します。

UI 上の表示名は現在 **Lumi** です（`src/lib/companion.ts`）。これは画面用の名前で、正式なコンパニオン名として確定していません。会話の人格は `src/lib/persona.ts` で管理し、system prompt では名前を固定していません。

## アプリの特徴

現在のコードに存在するものだけを記載しています。

- **Local AI Companion** — ローカルLLMを前提にした専用チャットアプリ
- **表示名 Lumi** — UI 用のプロファイル名（`src/lib/companion.ts`）。人格とは分離しています
- **会話基盤（Persona）** — 話し方・丁寧さ・回答の長さなどを `src/lib/persona.ts` で管理し、`/api/chat` が system prompt として付与します
- **ローカルLLM** — Ollama 上のモデル（既定: `myai:qwen3-8b`）とサーバー側で接続
- **チャットUI** — 会話一覧サイドバー、メッセージ表示、入力欄、生成中の停止
- **ストリーミング応答** — 生成された文章をトークン単位で逐次表示
- **Markdown** — 応答を `react-markdown` + `remark-gfm` で表示（コードブロックのコピーにも対応）
- **Memory / Settings UI** — `/memory` と `/settings` の画面はあります（見た目・テーマ変更以外はプレースホルダが多いです）
- **音声入力（Whisper）** — マイクボタンで録音し、faster-whisper-server が日本語を文字起こしして入力欄へ入れます
- **音声出力（VOICEPEAK）** — AI の完成した応答を voicepeak-server 経由で読み上げます。ストリーミング途中では呼びません

会話の履歴は `ChatProvider` のメモリ上で管理しています。ページを再読み込みすると、シード用のモック会話に戻ります。

## アーキテクチャ

ブラウザは Ollama にも faster-whisper-server にも voicepeak-server にも直接アクセスしません。チャットは `/api/chat`、音声認識は `/api/transcribe`、音声合成は `/api/tts` を経由します。

文字入力と音声入力は入力欄で合流し、送信は常に既存の `ChatProvider` 経由です。

```text
Browser
   │
   │ MediaRecorder
   ▼
Next.js
   │
   │ POST /api/transcribe
   ▼
faster-whisper-server
   │
   ▼
faster-whisper
   │
   ▼
Japanese text
   │
   ▼
Chat Input
   │
   │ User confirms and presses Send
   ▼
ChatProvider
   │
   ▼
/api/chat
   │
   ▼
Ollama
   │
   ▼
myai:qwen3-8b
```

チャット（Ollama）だけの経路:

```text
┌───────────────┐
│    Browser    │
│   Chat UI     │
└───────┬───────┘
        │
        │ POST /api/chat
        ▼
┌───────────────┐
│    Next.js    │
│  API Route    │
└───────┬───────┘
        │
        │ POST {OLLAMA_BASE_URL}/api/chat
        ▼
┌───────────────┐
│    Ollama     │
│ localhost:    │
│    11434      │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ myai:qwen3-8b │
└───────────────┘
```

コード上の流れ:

```text
チャット画面
  → ChatProvider.sendMessage()
  → streamChat()（src/lib/ollama.ts）
  → POST /api/chat（src/app/api/chat/route.ts）
  → Persona から System Prompt を生成して付与（src/lib/persona.ts）
  → Ollama POST /api/chat（stream: true, think: false）
  → トークンを Chat UI へ逐次表示
```

会話履歴は ChatProvider が user / assistant の順で `/api/chat` に送ります。system メッセージはクライアントから送らず、サーバー側で Persona から生成して先頭に付けます。

```text
system（Persona）
  → user
  → assistant
  → user
  → …
```

`src/lib/ollama.ts` は Client Component から呼ばれる接続口です。`OLLAMA_BASE_URL` / `OLLAMA_MODEL` は読みません。Ollama への実際のリクエストは `src/lib/ollama-server.ts` と `/api/chat` が担当します。

`streamChat()` は `onToken` / `onDone` / `onError` と `AbortSignal` によるキャンセルに対応しています。生成中の停止ボタンは、ブラウザ → Next.js → Ollama の順に中断します。

`mockStreamChat()` は UI 単体確認用に残していますが、通常の送信では使いません。

## Ollama 連携

- Ollama は **ローカル** で動かします（既定: `http://localhost:11434`）
- Ollama API は **Next.js のサーバー側** から呼び出します
- ブラウザから `http://localhost:11434` へ直接アクセスする構成にはしていません
- チャットは **`POST /api/chat`** を使います
- Ollama の応答は **ストリーミング** です（`stream: true`）
- Qwen3 の thinking 出力を通常のチャット画面へ表示しないため、API リクエストで **thinking を無効化** しています（`think: false`）
- 使用モデルは環境変数 **`OLLAMA_MODEL`** で変更できます

### ストリーミング

ユーザーがメッセージを送信すると、次の流れで生成文が逐次表示されます。

```text
Browser
  ↓ POST /api/chat
Next.js API
  ↓ POST /api/chat（Ollama, stream: true）
Ollama
  ↓ NDJSON のトークンを text/plain に変換
Chat UI（onToken で追記）
```

Ollama は NDJSON のチャンクを返します。`/api/chat` が `message.content` だけを取り出してプレーンテキストのストリームにし、Chat UI がそれを順に描画します。

### Thinking

Qwen3 の thinking 出力を通常のチャット画面へ表示しないため、Ollama API リクエストでは `think: false` を指定しています。

Settings 画面にも Thinking のスイッチがありますが、現時点では UI 上の状態だけで、実際の API リクエストにはつながっていません。サーバー側は常に `think: false` を送ります。

## 会話基盤（Persona）

人格・会話スタイルは Ollama の接続処理から分離しています。

| 対象 | ファイル | 役割 |
| --- | --- | --- |
| 表示名 | `src/lib/companion.ts` | UI に出す名前・頭文字。現在は Lumi |
| 人格 | `src/lib/persona.ts` の `defaultPersona` | 言語、雰囲気、性格、丁寧さ、話し方、回答の長さ |
| System Prompt | `src/lib/persona.ts` の `buildSystemPrompt()` | Persona から生成 |
| 付与 | `src/app/api/chat/route.ts` | `applyPersonaToMessages()` で会話の先頭に付ける |

話し方を変えたいときは、まず `src/lib/persona.ts` の `defaultPersona` を編集します。名前を UI だけ変えたいときは `src/lib/companion.ts` です。モデルに名前を覚えさせたい場合は、`defaultPersona.name` を設定してください（未設定のままが既定です）。

Settings 画面の System Prompt 欄はプレースホルダで、まだ Ollama へは送られません。

`myai:qwen3-8b` の Modelfile にも SYSTEM 文がありますが、アプリからの `/api/chat` では Persona 由来の system メッセージがリクエストごとにそれを上書きします。会話の調整は Modelfile ではなく `src/lib/persona.ts` を先に変えてください。

## 必要なもの

- [Node.js](https://nodejs.org/)（LTS 推奨）
- [pnpm](https://pnpm.io/)
- [Ollama](https://ollama.com/) がローカルで起動していること
- Ollama にモデル `myai:qwen3-8b` がインストールされていること
- 音声入力を使う場合は、別ディレクトリの faster-whisper-server が `http://127.0.0.1:8000` で起動していること
- 音声出力を使う場合は、別ディレクトリの voicepeak-server が `http://127.0.0.1:8001` で起動していること（VOICEPEAK 1.2.23）

### Ollama の起動確認

```bash
ollama list
```

`myai:qwen3-8b` が表示されれば準備完了です。モデルが無い場合:

```bash
ollama pull myai:qwen3-8b
```

モデルを直接起動して確認する場合:

```bash
ollama run myai:qwen3-8b
```

## セットアップ

### 1. リポジトリを取得

```bash
git clone <repository-url>
cd next.js-local-ai-companion
```

### 2. 依存関係をインストール

```bash
pnpm install
```

### 3. Ollama をインストール

[Ollama 公式サイト](https://ollama.com/) からインストールし、起動してください。通常はアプリを開くか、バックグラウンドサービスとして動きます。

### 4. モデルを取得

```bash
ollama pull myai:qwen3-8b
```

### 5. `.env.local` を設定

リポジトリ直下に `.env.local` を作成します（`.env.example` をコピーしても構いません）。

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=myai:qwen3-8b
WHISPER_SERVER_URL=http://127.0.0.1:8000
VOICEPEAK_SERVER_URL=http://127.0.0.1:8001
```

### 6. 開発サーバーを起動

```bash
pnpm dev
```

### 7. ブラウザでアクセス

```text
http://localhost:3000
```

## 環境変数

Ollama と faster-whisper-server、voicepeak-server への接続に使う値は **サーバー側専用** です。`NEXT_PUBLIC_` は付けないでください。ブラウザに公開する必要はありません。

| 変数 | 説明 | 既定値 |
| --- | --- | --- |
| `OLLAMA_BASE_URL` | Ollama のベース URL | `http://localhost:11434` |
| `OLLAMA_MODEL` | 使用するモデル名 | `myai:qwen3-8b` |
| `WHISPER_SERVER_URL` | faster-whisper-server のベース URL | `http://127.0.0.1:8000` |
| `VOICEPEAK_SERVER_URL` | voicepeak-server のベース URL | `http://127.0.0.1:8001` |

未設定の場合は `src/lib/ollama-server.ts` / `src/lib/whisper-server.ts` / `src/lib/voicepeak-server.ts` の既定値が使われます。`NEXT_PUBLIC_` は付けないでください。

### `.env.example` と `.env.local`

| ファイル | 役割 | Git |
| --- | --- | --- |
| `.env.example` | 必要な変数名とダミー値のテンプレート。秘密情報は入れません | 管理対象 |
| `.env.local` | 自分の開発環境向けの実際の設定 | **管理対象外** |

今回の Ollama 設定に API キーはありません。今後ほかの環境変数（キーやトークンなど）を足す場合も、実値は `.env.local` だけに置き、`.env.example` には名前とダミー値だけを書いてください。

## 技術スタック

`package.json` と実装に存在する範囲です。

- Next.js 16（App Router）
- React 19
- TypeScript
- Tailwind CSS v4
- Radix UI / shadcn スタイルのコンポーネント（Radix UI プリミティブ + 独自実装、CLI は未使用）
- Lucide（`lucide-react`）
- react-markdown
- remark-gfm
- Ollama（ローカル推論。npm 依存ではなく外部プロセス）
- faster-whisper-server（ローカル音声認識。npm 依存ではなく外部プロセス）
- voicepeak-server（ローカル TTS。npm 依存ではなく外部プロセス。VOICEPEAK 1.2.23）

パッケージマネージャは pnpm（`packageManager`: `pnpm@12.4.1`）です。

外部フォント（Google Fonts）は使用していません。サンドボックス環境やオフライン環境でもビルドが失敗しないよう、システムフォントスタックを使用しています。

## ディレクトリ構成

```
src/
  app/
    page.tsx            チャット画面（ルート）
    api/chat/route.ts        Ollama へのプロキシ（ストリーミング）
    api/transcribe/route.ts  faster-whisper-server へのプロキシ
    api/tts/route.ts         voicepeak-server へのプロキシ
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
    whisper.ts           クライアントの transcribeAudio()（/api/transcribe へ接続）
    whisper-server.ts    サーバー専用の Whisper 設定・エラー処理
    voicepeak.ts         クライアントの synthesizeSpeech()（/api/tts へ接続）
    voicepeak-server.ts  サーバー専用の VOICEPEAK 設定・エラー処理
    tts-text.ts          読み上げ用の短いテキスト整形（140文字制限）
    speech-playback.ts   ブラウザでの WAV 再生
    persona.ts           人格設定と System Prompt 生成
    companion.ts         UI 表示名（現在は Lumi。人格とは別）
    mock-data.ts         UI確認用の日本語会話モックデータ
    date.ts               日時フォーマット・グルーピング
    utils.ts              cn() ヘルパー

  hooks/
    use-voice-recorder.ts MediaRecorder による録音と文字起こし状態

  types/ai.ts             ChatMessage, Conversation, AIPresence, MicState などの型定義
```

## Voice Input

音声入力には **faster-whisper-server** が必要です。Next.js とは別プロセスで起動します。

### 起動方法（2 つのターミナル）

Terminal 1 — faster-whisper-server:

```powershell
cd D:\Code\faster-whisper-server
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

詳細は faster-whisper-server 側の README を参照してください。

Terminal 2 — Next.js:

```powershell
cd D:\Code\next.js-local-ai-companion
pnpm dev
```

ブラウザは `http://localhost:3000`（または `http://127.0.0.1:3000`）で開きます。マイク（`getUserMedia`）は Secure Context が必要なため、ローカルでは localhost を使ってください。

### 動作

1. チャット画面のマイクボタンを押す
2. ブラウザがマイクへのアクセス許可を求める
3. もう一度押すと録音停止
4. ブラウザは **`POST /api/transcribe`** に音声を送る（faster-whisper-server へは直接送らない）
5. Next.js サーバーが `WHISPER_SERVER_URL`（既定: `http://127.0.0.1:8000`）の `POST /transcribe` へ転送する
6. 認識された日本語テキストが **既存のチャット入力欄** に入る
7. ユーザーが内容を確認・編集し、既存の送信ボタンを押す
8. 既存の `ChatProvider.sendMessage()` → `/api/chat` → Ollama

音声認識結果は **自動送信しません**。

コード上の流れ:

```text
マイクボタン
  → useVoiceRecorder()（src/hooks/use-voice-recorder.ts）
  → MediaRecorder（ブラウザ標準 API）
  → transcribeAudio()（src/lib/whisper.ts）
  → POST /api/transcribe（src/app/api/transcribe/route.ts）
  → faster-whisper-server POST /transcribe
  → 入力欄へ text をセット（ChatProvider はまだ呼ばない）
  → ユーザーが送信
  → ChatProvider.sendMessage()
  → /api/chat → Ollama
```

`src/lib/whisper.ts` は Client Component から呼ばれる接続口です。`WHISPER_SERVER_URL` は読みません。Whisper サーバーへの実際のリクエストは `src/lib/whisper-server.ts` と `/api/transcribe` が担当します。

## Voice Output

音声出力には **voicepeak-server**（VOICEPEAK 1.2.23）が必要です。Next.js とは別プロセスで起動します。

```powershell
cd D:\Code\voicepeak-server
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

### 動作

1. ユーザーがメッセージを送信する（この操作を再生許可の起点にします）
2. 既存どおり `/api/chat` → Ollama で応答をストリーミング表示
3. **応答が完成してから 1 回だけ** `POST /api/tts` に完成テキストを送る
4. Next.js サーバーが `VOICEPEAK_SERVER_URL`（既定: `http://127.0.0.1:8001`）の `POST /synthesize` へ転送する
5. 返ってきた WAV をブラウザで再生する

140 文字超・コードブロックを含む回答は読み上げません（チャット表示は通常どおり）。voicepeak-server が止まっていてもテキストチャットは使えます。TTS 失敗は「音声を再生できませんでした」として扱い、チャットをエラーにはしません。

```text
ChatProvider.onDone（ストリーミング完了）
  → prepareSpeechText()（src/lib/tts-text.ts）
  → synthesizeSpeech()（src/lib/voicepeak.ts）
  → POST /api/tts（src/app/api/tts/route.ts）
  → voicepeak-server POST /synthesize
  → WAV を Audio で再生（src/lib/speech-playback.ts）
```

## Future work

次の機能は **未実装** です。UI や型の受け皿だけがあるものもあります。

- 長文の分割読み上げ
- 長期 Memory（会話を越えた永続記憶。`/memory` はプレースホルダ UI）
- Vector DB
- Web 検索
- 外部ツール連携

音声合成の声選択・長文分割・長期記憶については、今後の拡張です。`src/types/ai.ts` の `AIPresence`（`speaking`）と `TtsStatus` が起点になります。
