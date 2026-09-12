"use client";

import * as React from "react";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { OLLAMA_MODEL } from "@/lib/ollama";
import { SettingRow, SettingsSection } from "./setting-row";

const DEFAULT_SYSTEM_PROMPT =
  "あなたはユーザーの専属AIコンパニオンです。アシスタントというより、日々の生活を共にする相手として、親しみやすく、落ち着いた口調で会話してください。";

export function AISettings() {
  const [temperature, setTemperature] = React.useState(0.8);
  const [thinking, setThinking] = React.useState(true);
  const [systemPrompt, setSystemPrompt] = React.useState(DEFAULT_SYSTEM_PROMPT);

  return (
    <SettingsSection
      title="AI"
      description="応答生成に使うローカルモデルの挙動を調整します。"
    >
      <SettingRow label="モデル" description="Ollamaに登録されているモデル">
        <Select defaultValue={OLLAMA_MODEL}>
          <SelectTrigger aria-label="モデルを選択">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={OLLAMA_MODEL}>{OLLAMA_MODEL}</SelectItem>
            <SelectItem value="qwen3:8b" disabled>
              qwen3:8b (base)
            </SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>

      <SettingRow
        label="Temperature"
        description="値が高いほど応答が多様に、低いほど一貫性が増します。"
      >
        <div className="flex items-center gap-3">
          <Slider
            value={[temperature]}
            min={0}
            max={2}
            step={0.1}
            onValueChange={([v]) => setTemperature(v)}
            aria-label="Temperature"
          />
          <span className="w-9 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
            {temperature.toFixed(1)}
          </span>
        </div>
      </SettingRow>

      <SettingRow
        label="Thinking"
        description="拡張思考モードを有効にします（Qwen3のthinkingモード）。"
      >
        <div className="flex items-center gap-2">
          <Switch id="thinking-mode" checked={thinking} onCheckedChange={setThinking} />
          <Label htmlFor="thinking-mode" className="text-sm text-muted-foreground">
            {thinking ? "有効" : "無効"}
          </Label>
        </div>
      </SettingRow>

      <SettingRow label="System Prompt" align="start" description="AIの人格・話し方の土台になります。">
        <Textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={5}
          className="w-full rounded-md border border-input bg-input/30 px-3 py-2 scrollbar-thin"
        />
      </SettingRow>
    </SettingsSection>
  );
}
