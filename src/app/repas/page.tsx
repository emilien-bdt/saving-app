import type { Metadata } from "next";
import { WeekPage } from "@/modules/repas/components/week-page";

export const metadata: Metadata = { title: "Repas – Save" };

export default function Page({ searchParams }: PageProps<"/repas">) {
  return <WeekPage searchParams={searchParams} />;
}
