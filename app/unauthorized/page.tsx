import Link from "next/link";

import { UnauthorizedState } from "@/components/shared/ui-state";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return <main className="grid min-h-screen place-items-center bg-muted/40 p-4"><UnauthorizedState primaryAction={<Button asChild className="min-h-11"><Link href="/dashboard">Kembali ke dashboard</Link></Button>} /></main>;
}
