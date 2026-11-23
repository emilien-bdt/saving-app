import type { Metadata } from "next";
import { ListsPage } from "@/modules/todo/components/lists-page";

export const metadata: Metadata = { title: "Listes – To do – Save" };

export default function Page() {
  return <ListsPage />;
}
