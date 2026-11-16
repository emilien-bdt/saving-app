import type { Metadata } from "next";
import { TransactionsPage } from "@/modules/finances/components/transactions-page";

export const metadata: Metadata = { title: "Journal – Save" };

export default function Page({ searchParams }: PageProps<"/finances/transactions">) {
  return <TransactionsPage searchParams={searchParams} />;
}
