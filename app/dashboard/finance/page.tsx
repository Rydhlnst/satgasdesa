import Link from "next/link";
import { Landmark } from "lucide-react";

import { PageContainer } from "@/components/app-shell/page-container";
import { EmptyState } from "@/components/shared/empty-state";
import { MetricCard } from "@/components/shared/metric-card";
import { MoneyDisplay } from "@/components/shared/money-display";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { getFinanceSummary, getFinancialTransactionsPage } from "@/src/features/finance/service";
import { requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  await requirePermission(PERMISSIONS.FINANCE_READ);
  const [summary, transactions] = await Promise.all([getFinanceSummary(), getFinancialTransactionsPage({ pageSize: 8 })]);
  return <PageContainer><div className="space-y-8"><PageHeader breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Finance" }]} description="Review actual cash movements, approvals, reversals, and reconciliation against the source ledgers." eyebrow="Finance" title="Finance" actions={<Button asChild><Link href="/dashboard/finance/transactions">All transactions</Link></Button>} /><section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><MetricCard label="Cash balance" value={<MoneyDisplay value={summary.cashBalance} />} description="Approved and reversed cash movements" /><MetricCard label="Cash in" value={<MoneyDisplay value={summary.cashIn} />} description="Recorded cash inflow" /><MetricCard label="Cash out" value={<MoneyDisplay value={summary.cashOut} />} description="Recorded cash outflow" /><MetricCard label="Transactions" value={String(summary.transactionCount)} description={`${summary.draftCount} draft · ${summary.approvedCount} approved`} /></section><section className="rounded-xl border border-border bg-card shadow-sm"><div className="flex items-center justify-between border-b border-border px-5 py-4"><div><p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Latest ledger entries</p><h2 className="mt-1 font-heading text-xl font-semibold uppercase tracking-wide">Transactions</h2></div><StatusBadge status={summary.reconciliation.reconciled ? "PAID" : "URGENT"} label={summary.reconciliation.reconciled ? "Reconciled" : "Needs reconciliation"} /></div>{transactions.items.length ? <div className="divide-y divide-border">{transactions.items.map((item) => <Link className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/40" href={`/dashboard/finance/transactions/${item.id}`} key={item.id}><div><p className="font-semibold">{item.transactionCode}</p><p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{item.description}</p></div><div className="text-right"><p className={item.transactionType === "CASH_IN" ? "font-semibold text-emerald-700" : "font-semibold text-rose-700"}><MoneyDisplay value={item.transactionType === "CASH_IN" ? item.amount : -item.amount} /></p><p className="mt-1 text-xs text-muted-foreground"><StatusBadge status={item.status} /></p></div></Link>)}</div> : <EmptyState description="Approved or draft transactions will appear here." icon={Landmark} title="No transactions yet" />}</section></div></PageContainer>;
}
