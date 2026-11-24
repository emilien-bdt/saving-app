import type { Metadata } from "next";
import { ShoppingPage } from "@/modules/repas/components/shopping-page";

export const metadata: Metadata = { title: "Courses – Save" };

export default function Page({ searchParams }: PageProps<"/repas/courses">) {
  return <ShoppingPage searchParams={searchParams} />;
}
