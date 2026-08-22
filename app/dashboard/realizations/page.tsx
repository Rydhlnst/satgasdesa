import Link from "next/link";
import { ArrowRight, ReceiptText } from "lucide-react";

import { PageContainer } from "@/components/app-shell/page-container";
import { EmptyState } from "@/components/shared/empty-state";
import { MoneyDisplay } from "@/components/shared/money-display";
import { PageHeader } from "@/components/shared/page-header";
import { ResponsiveDataView } from "@/components/shared/responsive-data-view";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { getRealizations } from "@/src/features/budgets/service";
import { hasPermission, requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";
import { MobileRealizationScreen } from "../_components/mobile-finance-screens";

export const dynamic = "force-dynamic";
type Props = { searchParams: Promise<{ status?: string; query?: string }> };
const statuses = ["DRAFT", "SUBMITTED", "VERIFIED", "SAH", "REJECTED"] as const;

export default async function RealizationsPage({ searchParams }: Props) {
  const params = await searchParams;
  const session = await requirePermission(PERMISSIONS.REALIZATION_READ);
  const canCreate = await hasPermission(session.user.id, PERMISSIONS.REALIZATION_CREATE);
  const status = statuses.includes(params.status as (typeof statuses)[number]) ? params.status : undefined;
  const result = await getRealizations({ status, query: params.query?.trim() || undefined });
  const mobileEntries = result.items.map((entry) => ({ id: entry.realization.id, description: entry.realization.description, amount: entry.realization.requestedAmount, status: entry.realization.status, groupName: entry.groupName }));

  return (
    <PageContainer>
      <div className="space-y-8">
        <PageHeader breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Realizations" }]} description="Kelola pengajuan belanja dari draf, verifikasi, persetujuan, koreksi hingga pembalikan." eyebrow="Keuangan" title="Realisasi" actions={canCreate ? <Button asChild><Link href="/dashboard/realizations/new">Realisasi baru</Link></Button> : undefined} />
        <MobileRealizationScreen canCreate={canCreate} entries={mobileEntries} />
        <form className="hidden gap-3 border-y border-border py-4 sm:grid-cols-[180px_minmax(0,1fr)_auto] md:grid" method="get">
          <select aria-label="Filter status realisasi" className="h-10 border-b border-input bg-transparent text-sm" defaultValue={status ?? ""} name="status"><option value="">Semua status</option>{statuses.map((item) => <option key={item}>{item}</option>)}</select>
          <input className="h-10 border-b border-input bg-transparent text-sm" defaultValue={params.query ?? ""} name="query" placeholder="Cari uraian atau item anggaran" />
          <Button type="submit" variant="outline">Filter</Button>
        </form>
        {result.total === 0 ? (
          <section className="hidden rounded-xl border border-border bg-card md:block"><EmptyState description="Tidak ada pengajuan realisasi yang sesuai filter." icon={ReceiptText} title="Realisasi tidak ditemukan" /></section>
        ) : (
          <ResponsiveDataView
            rows={result.items}
            getRowKey={(entry) => entry.realization.id}
            desktopHeader={<><th className="px-5 py-4">Pengajuan</th><th className="px-5 py-4">Periode</th><th className="px-5 py-4">Nilai</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Alokasi</th><th className="px-5 py-4 text-right">Aksi</th></>}
            desktop={(entry) => <><td className="px-5 py-5"><p className="max-w-sm truncate font-semibold">{entry.realization.description}</p><p className="mt-1 text-xs text-muted-foreground">{entry.groupName} · {entry.budgetItemName}</p></td><td className="px-5 py-5">{entry.periodKey}</td><td className="px-5 py-5"><MoneyDisplay value={entry.realization.requestedAmount} /></td><td className="px-5 py-5"><div className="flex flex-wrap gap-2"><StatusBadge status={entry.realization.status} />{entry.realization.isOverAllocation === 1 ? <StatusBadge status="URGENT" label="Melebihi alokasi" /> : null}</div></td><td className="px-5 py-5 text-xs text-muted-foreground">{entry.realization.isOverAllocation === 1 ? "Perlu persetujuan khusus" : "Dalam alokasi"}</td><td className="px-5 py-5 text-right"><Button asChild size="xs" variant="ghost"><Link href={`/dashboard/realizations/${entry.realization.id}`}>Buka <ArrowRight aria-hidden="true" /></Link></Button></td></>}
            mobile={(entry) => <div className="space-y-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold">{entry.realization.description}</p><p className="mt-1 text-xs text-muted-foreground">{entry.groupName} · {entry.budgetItemName}</p></div><StatusBadge status={entry.realization.status} /></div><div className="flex items-end justify-between gap-4"><div><p className="text-xs text-muted-foreground">Nilai pengajuan</p><MoneyDisplay value={entry.realization.requestedAmount} /></div><Button asChild size="sm" variant="outline"><Link href={`/dashboard/realizations/${entry.realization.id}`}>Buka <ArrowRight aria-hidden="true" /></Link></Button></div>{entry.realization.isOverAllocation === 1 ? <p className="text-xs font-medium text-amber-700">Melebihi alokasi · perlu persetujuan khusus</p> : null}</div>}
          />
        )}
      </div>
    </PageContainer>
  );
}
