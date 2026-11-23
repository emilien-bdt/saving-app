import { revalidatePath } from "next/cache";

/** To do pages + the home dashboard (its widget shows today's tasks). */
export function revalidateTodo(): void {
  revalidatePath("/todo", "layout");
  revalidatePath("/");
}
