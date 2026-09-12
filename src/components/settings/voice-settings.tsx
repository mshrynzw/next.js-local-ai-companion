"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ComingSoonBadge, SettingRow, SettingsSection } from "./setting-row";

export function VoiceSettings() {
  return (
    <SettingsSection
      title="Voice"
      description="音声認識・音声合成の設定です。今後Whisper／TTSと接続予定です。"
    >
      <SettingRow label="Speech recognition" description="音声をテキストに変換するモデル">
        <div className="flex items-center gap-2">
          <Select defaultValue="whisper-base" disabled>
            <SelectTrigger aria-label="音声認識モデルを選択">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="whisper-base">Whisper (base)</SelectItem>
            </SelectContent>
          </Select>
          <ComingSoonBadge />
        </div>
      </SettingRow>

      <SettingRow label="Voice" description="読み上げに使う声">
        <div className="flex items-center gap-2">
          <Select defaultValue="default" disabled>
            <SelectTrigger aria-label="読み上げ音声を選択">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">デフォルト</SelectItem>
            </SelectContent>
          </Select>
          <ComingSoonBadge />
        </div>
      </SettingRow>

      <SettingRow label="Speaking speed" description="読み上げ速度">
        <div className="flex items-center gap-3 opacity-60">
          <Slider defaultValue={[1]} min={0.5} max={2} step={0.1} disabled aria-label="読み上げ速度" />
          <span className="w-9 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
            1.0x
          </span>
        </div>
      </SettingRow>
    </SettingsSection>
  );
}
