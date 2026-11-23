import { RepasShell } from "@/modules/repas/components/repas-shell";

export default function RepasLayout({ children }: LayoutProps<"/repas">) {
  return <RepasShell>{children}</RepasShell>;
}
