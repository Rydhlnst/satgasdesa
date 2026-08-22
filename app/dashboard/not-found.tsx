import Link from "next/link";

import { NotFoundState } from "@/components/shared/ui-state";
import { PageContainer } from "@/components/app-shell/page-container";
import { Button } from "@/components/ui/button";

export default function DashboardNotFound() {
  return <PageContainer><NotFoundState primaryAction={<Button asChild className="min-h-11"><Link href="/dashboard">Kembali ke dashboard</Link></Button>} /></PageContainer>;
}
