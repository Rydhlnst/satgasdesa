import Link from "next/link";
import { notFound } from "next/navigation";

import { PageContainer } from "@/components/app-shell/page-container";
import { MetricCard } from "@/components/shared/metric-card";
import { MoneyDisplay } from "@/components/shared/money-display";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { approveBudgetPeriodAction, verifyBudgetPeriodAction } from "../_actions";
import { getBudgetPeriodDetail } from "@/src/features/budgets/service";
import { hasPermission, requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ period: string }> };

export default async function BudgetDetailPage({ params }: Props) {
  const { period } = await params;
  const session = await requirePermission(PERMISSIONS.BUDGET_READ);
  let result;
  try { result = await getBudgetPeriodDetail(period); } catch { notFound(); }
  const canCreate = await hasPermission(session.user.id, PERMISSIONS.BUDGET_CREATE);
  const canVerify = await hasPermission(session.user.id, PERMISSIONS.BUDGET_VERIFY);
  const canApprove = await hasPermission(session.user.id, PERMISSIONS.BUDGET_APPROVE);
  return <PageContainer><div className="space-y-8"><PageHeader breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Budgets", href: "/dashboard/budgets" }, { label: result.period.periodKey }]} description="Allocation details, realization pressure, revisions, and approval controls." eyebrow="Budget period" title={result.period.periodKey} actions={<><StatusBadge status={result.period.status} />{canCreate && result.period.status === "DRAFT" ? <Button asChild variant="outline"><Link href={`/dashboard/budgets/${period}/edit`}>Edit allocations</Link></Button> : null}</>} /><section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><MetricCard label="Available funds" value={<MoneyDisplay value={result.summary.availableFunds} />} /><MetricCard label="Allocation" value={<MoneyDisplay value={result.summary.totalAllocation} />} /><MetricCard label="Remaining" value={<MoneyDisplay value={result.summary.remainingAllocation} />} /><MetricCard label="Absorption" value={`${result.summary.absorptionPercentage}%`} description={`${result.summary.overAllocatedRealizations} over-allocation requests`} /></section><div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]"><div className="space-y-6">{result.groups.map((group) => <Card className="shadow-sm" key={group.id}><CardHeader><CardTitle className="font-heading text-xl uppercase tracking-wide">{group.name}</CardTitle></CardHeader><CardContent>{group.items.length ? <div className="divide-y divide-border">{group.items.map((item) => <div className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0" key={item.id}><div><p className="font-semibold">{item.name}</p>{item.notes ? <p className="mt-1 text-xs text-muted-foreground">{item.notes}</p> : null}</div><MoneyDisplay value={item.allocatedAmount} /></div>)}</div> : <p className="text-sm text-muted-foreground">No allocation items in this group.</p>}</CardContent></Card>)}{result.revisions.length ? <Card><CardHeader><CardTitle>Revision history</CardTitle></CardHeader><CardContent><div className="divide-y divide-border">{result.revisions.map((entry) => <div className="py-3 first:pt-0 last:pb-0" key={entry.revision.id}><p className="text-sm font-medium">{entry.itemName}</p><p className="mt-1 text-xs text-muted-foreground"><MoneyDisplay value={entry.revision.previousAmount} /> → <MoneyDisplay value={entry.revision.nextAmount} /> · {entry.revision.reason}</p></div>)}</div></CardContent></Card> : null}</div><div className="space-y-5">{canVerify && result.period.status === "DRAFT" ? <Card><CardHeader><CardTitle>Verify period</CardTitle></CardHeader><CardContent><form action={verifyBudgetPeriodAction} className="space-y-3"><input name="id" type="hidden" value={period} /><textarea className="min-h-20 w-full border border-input bg-transparent p-3 text-sm" name="notes" placeholder="Verification notes" /><Button type="submit">Verify budget</Button></form></CardContent></Card> : null}{canApprove && result.period.status === "VERIFIED" ? <Card><CardHeader><CardTitle>Approve period</CardTitle></CardHeader><CardContent><form action={approveBudgetPeriodAction} className="space-y-3"><input name="id" type="hidden" value={period} /><textarea className="min-h-20 w-full border border-input bg-transparent p-3 text-sm" name="approvalNotes" placeholder="Approval notes" /><Button type="submit">Approve budget</Button></form></CardContent></Card> : null}<Card><CardHeader><CardTitle>Workflow</CardTitle></CardHeader><CardContent><p className="text-sm leading-relaxed text-muted-foreground">A period must be verified before it can be approved. Approved periods are the only source for new realization requests.</p></CardContent></Card></div></div></div></PageContainer>;
}
