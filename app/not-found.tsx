import Link from "next/link";

import { NotFoundState } from "@/components/shared/ui-state";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return <main className="grid min-h-screen place-items-center bg-background p-4"><NotFoundState primaryAction={<Button asChild className="min-h-11"><Link href="/login">Kembali ke login</Link></Button>} /></main>;
}
