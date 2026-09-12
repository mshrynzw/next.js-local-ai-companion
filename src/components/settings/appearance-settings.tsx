"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";

import { cn } from "@/lib/utils";
import { ACCENT_OPTIONS, useAccent, useTheme, type ThemeMode } from "@/components/providers/theme-provider";
import { SettingRow, SettingsSection } from "./setting-row";

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const { accent, setAccent } = useAccent();

  return (
    <SettingsSection title="Appearance" description="見た目の好みに合わせて調整できます。">
      <SettingRow label="Theme" description="ダークテーマを基本としています。">
        <div className="grid grid-cols-3 gap-2">
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs transition-colors",
                theme === value
                  ? "border-primary/60 bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
              aria-pressed={theme === value}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>
      </SettingRow>

      <SettingRow label="Accent color" description="ボタンや選択状態に使われる色です。">
        <div className="flex items-center gap-2.5">
          {ACCENT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setAccent(option.value)}
              className="flex size-8 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-background transition-shadow"
              style={{
                backgroundColor: option.swatch,
                ["--tw-ring-color" as string]: accent === option.value ? option.swatch : "transparent",
              }}
              aria-pressed={accent === option.value}
              aria-label={option.label}
              title={option.label}
            >
              {accent === option.value && <Check className="size-4 text-black/70 mix-blend-luminosity" />}
            </button>
          ))}
        </div>
      </SettingRow>
    </SettingsSection>
  );
}
