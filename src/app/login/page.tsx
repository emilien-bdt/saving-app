import type { Metadata } from "next";
import { LoginForm } from "@/shared/auth/components/login-form";

export const metadata: Metadata = { title: "Connexion – Save" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-10">
      <h1 className="text-2xl font-semibold">Save</h1>
      <p className="mt-1 text-muted-foreground">Entre ton mot de passe pour continuer.</p>
      <LoginForm next={typeof next === "string" ? next : undefined} />
    </main>
  );
}
