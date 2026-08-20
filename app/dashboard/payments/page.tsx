import Link from "next/link";

import { PageContainer } from "@/components/app-shell/page-container";
import { EmptyState } from "@/components/shared/empty-state";
import { MoneyDisplay } from "@/components/shared/money-display";
import { PageHeader } from "@/components/shared/page-header";
import { ResponsiveDataView } from "@/components/shared/responsive-data-view";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { getDuesPage } from "@/src/features/dues/service";
import { requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  await requirePermission(PERMISSIONS.PAYMENT_CREATE);
  const result = await getDuesPage({ pageSize: 100 });
  const rows = result.rows;

  return <PageContainer><div className="space-y-8"><PageHeader breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Dues", href: "/dashboard/dues" }, { label: "Payment register" }]} description="Catat pembayaran sebagian atau penuh dari setiap tagihan." eyebrow="Keuangan" title="Payment register" />{result.pagination.total === 0 ? <section className="rounded-xl border border-border bg-card"><EmptyState description="Belum ada tagihan yang dapat dibayar." title="Tidak ada kandidat pembayaran" /></section> : <ResponsiveDataView rows={rows} getRowKey={(row) => row.due.id} desktopHeader={<><th className="px-5 py-4">Pembayar</th><th className="px-5 py-4">Sisa tagihan</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Aksi</th></>} desktop={(row) => <><td className="px-5 py-5"><p className="font-semibold">{row.due.payerName}</p><p className="mt-1 text-xs text-muted-foreground">{row.excavator.unitCode} · {row.due.referenceKey}</p></td><td className="px-5 py-5"><MoneyDisplay value={row.due.amountDue - row.due.amountPaid} /></td><td className="px-5 py-5"><StatusBadge status={row.due.amountDue > row.due.amountPaid ? "OPEN" : "PAID"} /></td><td className="px-5 py-5 text-right"><Button asChild size="xs" variant="outline"><Link href={`/dashboard/dues/${row.due.id}`}>Catat pembayaran</Link></Button></td></>} mobile={(row) => <div className="space-y-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{row.due.payerName}</p><p className="mt-1 text-xs text-muted-foreground">{row.excavator.unitCode} · {row.due.referenceKey}</p></div><StatusBadge status={row.due.amountDue > row.due.amountPaid ? "OPEN" : "PAID"} /></div><div className="flex items-end justify-between gap-4"><div><p className="text-xs text-muted-foreground">Sisa tagihan</p><MoneyDisplay value={row.due.amountDue - row.due.amountPaid} /></div><Button asChild size="sm" variant="outline"><Link href={`/dashboard/dues/${row.due.id}`}>Catat pembayaran</Link></Button></div></div>} />}</div></PageContainer>;
}
