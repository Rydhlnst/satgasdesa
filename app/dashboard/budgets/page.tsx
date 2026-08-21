import Link from "next/link";
import { ArrowRight, ListChecks } from "lucide-react";

import { PageContainer } from "@/components/app-shell/page-container";
import { ActionForm } from "@/components/shared/action-form";
import { EmptyState } from "@/components/shared/empty-state";
import { MetricCard } from "@/components/shared/metric-card";
import { MoneyDisplay } from "@/components/shared/money-display";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { getBudgetPeriods } from "@/src/features/budgets/service";
import { BUDGET_PERIOD_STATUSES } from "@/src/features/budgets/constants";
import { hasPermission, requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";
import { createBudgetPeriodAction } from "./_actions";

export const dynamic = "force-dynamic";
type Props = { searchParams: Promise<{ status?: string; query?: string }> };

export default async function BudgetsPage({ searchParams }: Props) {
  const params = await searchParams;
  const session = await requirePermission(PERMISSIONS.BUDGET_READ);
  const canCreate = await hasPermission(session.user.id, PERMISSIONS.BUDGET_CREATE);
  const status = BUDGET_PERIOD_STATUSES.includes(params.status as (typeof BUDGET_PERIOD_STATUSES)[number]) ? params.status : undefined;
  const result = await getBudgetPeriods({ status, query: params.query?.trim() || undefined });
  return <PageContainer><div className="space-y-8"><PageHeader breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Budgets" }]} description="Prepare period-based allocations, track revisions, and move each budget through verification and approval." eyebrow="Finance" title="Budgets" />{canCreate ? <section className="rounded-xl border border-border bg-card p-5 shadow-sm"><h2 className="font-heading text-xl font-semibold uppercase tracking-wide">Create budget period</h2><ActionForm action={createBudgetPeriodAction} className="mt-5 grid gap-4 sm:grid-cols-3"><label className="space-y-2 text-sm"><span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Period</span><input className="h-10 w-full border-b border-input bg-transparent" name="periodKey" placeholder="2026-08" required /></label><label className="space-y-2 text-sm"><span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Opening balance</span><input className="h-10 w-full border-b border-input bg-transparent" min="0" name="openingBalance" type="number" required /></label><label className="space-y-2 text-sm"><span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Estimated income</span><input className="h-10 w-full border-b border-input bg-transparent" min="0" name="estimatedIncome" type="number" required /></label><div className="sm:col-span-3"><Button type="submit">Create period</Button></div></ActionForm></section> : null}<form className="grid gap-3 border-y border-border py-4 sm:grid-cols-[180px_minmax(0,1fr)_auto]" method="get"><select aria-label="Filter budget status" className="h-10 border-b border-input bg-transparent text-sm" defaultValue={status ?? ""} name="status"><option value="">All statuses</option>{BUDGET_PERIOD_STATUSES.map((item) => <option key={item}>{item}</option>)}</select><input className="h-10 border-b border-input bg-transparent text-sm" defaultValue={params.query ?? ""} name="query" placeholder="Search period, e.g. 2026-08" /><Button type="submit" variant="outline">Filter</Button></form>{result.total === 0 ? <section className="rounded-xl border border-border bg-card"><EmptyState description="Create the first accounting period to begin allocation planning." icon={ListChecks} title="No budget periods found" /></section> : <section className="grid gap-4 lg:grid-cols-2">{result.items.map((item) => <article className="rounded-xl border border-border bg-card p-5 shadow-sm" key={item.id}><div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Accounting period</p><h2 className="mt-2 font-heading text-2xl font-semibold">{item.periodKey}</h2></div><StatusBadge status={item.status} /></div><div className="mt-6 grid gap-4 sm:grid-cols-3"><MetricCard label="Available" value={<MoneyDisplay value={item.availableFunds} />} /><MetricCard label="Allocated" value={<MoneyDisplay value={item.totalAllocation} />} /><MetricCard label="Absorption" value={`${item.absorptionPercentage}%`} /></div><div className="mt-5 flex items-center justify-between border-t border-border pt-4"><p className="text-xs text-muted-foreground">{item.pendingRealization} pending realization</p><Button asChild size="sm" variant="outline"><Link href={`/dashboard/budgets/${item.id}`}>Open period <ArrowRight aria-hidden="true" /></Link></Button></div></article>)}</section>}</div></PageContainer>;
}
