import type { Metadata } from "next";
import { DishesPage } from "@/modules/repas/components/dishes-page";

export const metadata: Metadata = { title: "Plats – Save" };

export default function Page() {
  return <DishesPage />;
}
