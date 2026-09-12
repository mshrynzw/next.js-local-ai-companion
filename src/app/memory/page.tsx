import type { Metadata } from "next";

import { MemoryView } from "@/components/memory/memory-view";

export const metadata: Metadata = {
  title: "Memory — Local AI Companion",
};

export default function MemoryPage() {
  return <MemoryView />;
}
