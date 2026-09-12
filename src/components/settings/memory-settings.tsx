"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { BrainCircuit } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SettingRow, SettingsSection } from "./setting-row";

export function MemorySettings() {
  const [enabled, setEnabled] = React.useState(false);
  const router = useRouter();

  return (
    <SettingsSection
      title="Memory"
      description="会話を越えて覚えておいてほしいことを管理します。"
    >
      <SettingRow
        label="Enable memory"
        description="有効にすると、会話の中から長期的に覚えておくべき内容を記録します。"
      >
        <div className="flex items-center gap-2">
          <Switch id="memory-enabled" checked={enabled} onCheckedChange={setEnabled} />
          <Label htmlFor="memory-enabled" className="text-sm text-muted-foreground">
            {enabled ? "有効" : "無効"}
          </Label>
        </div>
      </SettingRow>

      <SettingRow label="Memory management" description="記憶している内容の確認・削除">
        <Button variant="outline" className="gap-2" onClick={() => router.push("/memory")}>
          <BrainCircuit className="size-4" />
          Memoryを開く
        </Button>
      </SettingRow>
    </SettingsSection>
  );
}
