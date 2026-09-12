"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AISettings } from "./ai-settings";
import { VoiceSettings } from "./voice-settings";
import { MemorySettings } from "./memory-settings";
import { AppearanceSettings } from "./appearance-settings";

export function SettingsView() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="border-b border-border/70 px-4 py-4 sm:px-6">
        <h1 className="text-lg font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">AIコンパニオンの動作をカスタマイズします。</p>
      </header>

      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
          <Tabs defaultValue="ai">
            <TabsList>
              <TabsTrigger value="ai">AI</TabsTrigger>
              <TabsTrigger value="voice">Voice</TabsTrigger>
              <TabsTrigger value="memory">Memory</TabsTrigger>
              <TabsTrigger value="appearance">Appearance</TabsTrigger>
            </TabsList>

            <TabsContent value="ai">
              <AISettings />
            </TabsContent>
            <TabsContent value="voice">
              <VoiceSettings />
            </TabsContent>
            <TabsContent value="memory">
              <MemorySettings />
            </TabsContent>
            <TabsContent value="appearance">
              <AppearanceSettings />
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}
