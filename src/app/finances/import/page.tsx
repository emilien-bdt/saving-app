import type { Metadata } from "next";
import { ImportPage } from "@/modules/finances/components/import/import-page";

export const metadata: Metadata = { title: "Importer – Save" };

export default function Page() {
  return <ImportPage />;
}
