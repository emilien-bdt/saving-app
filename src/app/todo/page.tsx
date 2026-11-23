import type { Metadata } from "next";
import { TodoPage } from "@/modules/todo/components/todo-page";

export const metadata: Metadata = { title: "To do – Save" };

export default function Page({ searchParams }: PageProps<"/todo">) {
  return <TodoPage searchParams={searchParams} />;
}
