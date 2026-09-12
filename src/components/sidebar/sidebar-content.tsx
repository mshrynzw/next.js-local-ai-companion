"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrainCircuit, Settings, SquarePen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PresenceOrb } from "@/components/ai/presence-orb";
import { useChatContext } from "@/components/providers/chat-provider";
import { cn } from "@/lib/utils";
import { ConversationHistory } from "./conversation-history";

export interface SidebarContentProps {
  /** Called after an action that should close the mobile drawer. */
  onNavigate?: () => void;
}

export function SidebarContent({ onNavigate }: SidebarContentProps) {
  const pathname = usePathname();
  const { conversations, activeConversation, presence, createConversation, selectConversation, deleteConversation } =
    useChatContext();

  const isChatRoute = pathname === "/";

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-4 pb-3 pt-4">
        <PresenceOrb presence={presence} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-sidebar-foreground">
            Local AI Companion
          </p>
          <p className="truncate text-[11px] text-sidebar-foreground/40">myai:qwen3-8b</p>
        </div>
      </div>

      <div className="px-3">
        <Button
          variant="secondary"
          className="w-full justify-start gap-2 border border-sidebar-border bg-sidebar-accent/50 text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={() => {
            createConversation();
            onNavigate?.();
          }}
        >
          <SquarePen className="size-4" />
          New chat
        </Button>
      </div>

      <ScrollArea className="mt-4 min-h-0 flex-1 px-3">
        <ConversationHistory
          conversations={conversations}
          activeId={isChatRoute ? activeConversation?.id : undefined}
          onSelect={(id) => {
            selectConversation(id);
            onNavigate?.();
          }}
          onDelete={deleteConversation}
        />
        <div className="h-2" />
      </ScrollArea>

      <nav className="flex flex-col gap-0.5 border-t border-sidebar-border px-3 py-3">
        <SidebarNavLink
          href="/memory"
          label="Memory"
          icon={BrainCircuit}
          active={pathname === "/memory"}
          onClick={onNavigate}
        />
        <SidebarNavLink
          href="/settings"
          label="Settings"
          icon={Settings}
          active={pathname === "/settings"}
          onClick={onNavigate}
        />
      </nav>
    </div>
  );
}

function SidebarNavLink({
  href,
  label,
  icon: Icon,
  active,
  onClick,
}: {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
      )}
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}
