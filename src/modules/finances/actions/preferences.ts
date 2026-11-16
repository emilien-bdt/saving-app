"use server";

import { cookies } from "next/headers";
import { requireSession } from "@/shared/auth/server";
import { VIEW_COOKIE } from "../domain/list-filters";

/** Remembers the Détaillée / Groupée choice for the next visits. */
export async function rememberTransactionView(param: string): Promise<void> {
  await requireSession();
  (await cookies()).set(VIEW_COOKIE, param === "groupee" ? "groupee" : "detaillee", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: true,
  });
}
