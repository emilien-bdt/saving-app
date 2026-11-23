import type { Metadata } from "next";
import { HomePage } from "@/modules/hub/home-page";

export const metadata: Metadata = { title: "Accueil – Save" };

export default function Page() {
  return <HomePage />;
}
