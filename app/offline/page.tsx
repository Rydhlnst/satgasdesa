import Link from "next/link";

import { OfflineState } from "@/components/shared/ui-state";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return <main className="grid min-h-screen place-items-center bg-background p-4"><OfflineState primaryAction={<Button asChild className="min-h-11"><Link href="/login">Kembali ke login</Link></Button>} /></main>;
}
