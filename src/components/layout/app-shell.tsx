"use client";

import * as React from "react";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SidebarContent } from "@/components/sidebar/sidebar-content";
import { MobileTopBar } from "./mobile-topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  return (
    <div className="flex h-dvh min-h-0 overflow-hidden bg-background">
      <aside className="hidden w-72 shrink-0 border-r border-sidebar-border bg-sidebar md:flex md:flex-col">
        <SidebarContent />
      </aside>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-[85%] p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>ナビゲーション</SheetTitle>
          </SheetHeader>
          <SidebarContent onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
