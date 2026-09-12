import type { Metadata } from "next";

import { SettingsView } from "@/components/settings/settings-view";

export const metadata: Metadata = {
  title: "Settings — Local AI Companion",
};

export default function SettingsPage() {
  return <SettingsView />;
}
