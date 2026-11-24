import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/shared/auth/components/login-form";
import { getCurrentUser } from "@/shared/auth/server";

export const metadata: Metadata = { title: "Connexion – Save" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  if (await getCurrentUser()) redirect("/");

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-5 py-10">
      <div className="flex flex-col items-center text-center">
        <span className="inline-flex size-16 items-center justify-center rounded-[1.1rem] bg-primary text-3xl font-bold text-primary-foreground shadow-sm">
          S
        </span>
        <h1 className="mt-4 text-[34px] leading-[41px] font-bold tracking-tight">Save</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">Connecte-toi pour continuer.</p>
      </div>
      <LoginForm next={typeof next === "string" ? next : undefined} />
    </main>
  );
}
