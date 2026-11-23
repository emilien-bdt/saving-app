import type { Metadata } from "next";
import { SettingsPage } from "@/modules/repas/components/settings-page";

export const metadata: Metadata = { title: "Paramètres Repas – Save" };

export default function Page() {
  return <SettingsPage />;
}
