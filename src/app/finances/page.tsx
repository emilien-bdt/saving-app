import type { Metadata } from "next";
import { DashboardPage } from "@/modules/finances/components/dashboard/dashboard-page";

export const metadata: Metadata = { title: "Piloter – Save" };

export default function Page({ searchParams }: PageProps<"/finances">) {
  return <DashboardPage searchParams={searchParams} />;
}
