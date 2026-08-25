import Link from "next/link";
import { ArrowRight, FilePlus2 } from "lucide-react";

import { PageContainer } from "@/components/app-shell/page-container";
import { EmptyState } from "@/components/shared/empty-state";
import { MoneyDisplay } from "@/components/shared/money-display";
import { PageHeader } from "@/components/shared/page-header";
import { ResponsiveDataView } from "@/components/shared/responsive-data-view";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { FUND_REQUEST_STATUSES } from "@/src/features/fund-requests/constants";
import { getFundRequests } from "@/src/features/fund-requests/service";
import { hasPermission, requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ status?: string; query?: string }> };

export default async function FundRequestsPage({ searchParams }: Props) {
  const params = await searchParams;
  const session = await requirePermission(PERMISSIONS.FUND_REQUEST_READ);
  const status = FUND_REQUEST_STATUSES.includes(params.status as (typeof FUND_REQUEST_STATUSES)[number]) ? params.status as (typeof FUND_REQUEST_STATUSES)[number] : undefined;
  const [result, canCreate] = await Promise.all([
    getFundRequests({ status, query: params.query?.trim() || undefined }),
    hasPermission(session.user.id, PERMISSIONS.FUND_REQUEST_CREATE),
  ]);

  return <PageContainer><div className="space-y-8"><PageHeader breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Pengajuan Dana" }]} description="Kelola pengajuan dana dari draf hingga verifikasi dan persetujuan." eyebrow="Keuangan" title="Pengajuan Dana" actions={canCreate ? <Button asChild><Link href="/dashboard/fund-requests/new">Pengajuan baru</Link></Button> : undefined} /><form className="hidden gap-3 border-y border-border py-4 sm:grid-cols-[180px_minmax(0,1fr)_auto] md:grid" method="get"><select aria-label="Filter status pengajuan dana" className="h-10 border-b border-input bg-transparent text-sm" defaultValue={status ?? ""} name="status"><option value="">Semua status</option>{FUND_REQUEST_STATUSES.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select><input className="h-10 border-b border-input bg-transparent text-sm" defaultValue={params.query ?? ""} name="query" placeholder="Cari nomor atau uraian" /><Button type="submit" variant="outline">Filter</Button></form>{result.total === 0 ? <section className="rounded-xl border border-border bg-card"><EmptyState description="Pengajuan dana yang Anda buat atau perlu ditinjau akan muncul di sini." icon={FilePlus2} title="Tidak ada pengajuan dana" /></section> : <ResponsiveDataView rows={result.items} getRowKey={(entry) => entry.request.id} desktopHeader={<><th className="px-5 py-4">Pengajuan</th><th className="px-5 py-4">Periode</th><th className="px-5 py-4">Nilai</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Aksi</th></>} desktop={(entry) => <><td className="px-5 py-5"><p className="font-semibold">{entry.request.title}</p><p className="mt-1 text-xs text-muted-foreground">{entry.request.requestNumber} · {entry.categoryName}</p></td><td className="px-5 py-5 text-sm">{entry.periodKey}</td><td className="px-5 py-5"><MoneyDisplay value={entry.request.amount} /></td><td className="px-5 py-5"><StatusBadge status={entry.request.status} /></td><td className="px-5 py-5 text-right"><Button asChild size="xs" variant="ghost"><Link href={`/dashboard/fund-requests/${entry.request.id}`}>Buka <ArrowRight aria-hidden="true" /></Link></Button></td></>} mobile={(entry) => <div className="space-y-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold">{entry.request.title}</p><p className="mt-1 text-xs text-muted-foreground">{entry.request.requestNumber} · {entry.periodKey}</p></div><StatusBadge status={entry.request.status} /></div><div className="flex items-end justify-between gap-4"><MoneyDisplay value={entry.request.amount} /><Button asChild size="sm" variant="outline"><Link href={`/dashboard/fund-requests/${entry.request.id}`}>Buka <ArrowRight aria-hidden="true" /></Link></Button></div></div>} />}</div></PageContainer>;
}
