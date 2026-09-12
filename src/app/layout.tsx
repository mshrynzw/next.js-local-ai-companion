import type { Metadata, Viewport } from "next";

import { ThemeProvider, THEME_INIT_SCRIPT } from "@/components/providers/theme-provider";
import { ChatProvider } from "@/components/providers/chat-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/layout/app-shell";

import "./globals.css";

export const metadata: Metadata = {
  title: "Local AI Companion",
  description: "ローカルPC上で動くAIとの、あなただけの会話空間。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0b10",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ja"
      className="dark h-full antialiased"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="h-full min-h-full bg-background text-foreground">
        <ThemeProvider>
          <TooltipProvider>
            <ChatProvider>
              <AppShell>{children}</AppShell>
            </ChatProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
