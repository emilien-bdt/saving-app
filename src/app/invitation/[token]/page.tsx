import type { Metadata } from "next";
import { InvitationPage } from "@/modules/accounts/components/invitation-page";

export const metadata: Metadata = { title: "Invitation – Save" };

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <InvitationPage token={token} />;
}
