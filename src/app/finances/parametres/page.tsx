import type { Metadata } from "next";
import { SettingsPage } from "@/modules/finances/components/settings-page";

export const metadata: Metadata = { title: "Paramètres – Save" };

export default function Page() {
  return <SettingsPage />;
}
