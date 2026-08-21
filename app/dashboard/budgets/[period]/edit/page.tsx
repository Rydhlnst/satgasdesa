import { notFound } from "next/navigation";
import { PageContainer } from "@/components/app-shell/page-container";
import { ActionForm } from "@/components/shared/action-form";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBudgetPeriodDetail } from "@/src/features/budgets/service";
import { requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";
import { createBudgetItemAction, reviseBudgetItemAction, updateBudgetItemAction } from "../../_actions";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ period: string }> };

export default async function BudgetEditPage({ params }: Props) {
  const { period } = await params;
  await requirePermission(PERMISSIONS.BUDGET_CREATE);
  let result;
  try { result = await getBudgetPeriodDetail(period); } catch { notFound(); }
  if (result.period.status !== "DRAFT") return <PageContainer><PageHeader breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Budgets", href: "/dashboard/budgets" }, { label: result.period.periodKey }]} title="Budget is locked" description="Only draft budget periods can be edited." /></PageContainer>;
  return <PageContainer><div className="space-y-8"><PageHeader breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Budgets", href: "/dashboard/budgets" }, { label: result.period.periodKey, href: `/dashboard/budgets/${period}` }, { label: "Edit" }]} description="Update allocation names and amounts while the period remains in draft." eyebrow="Budget editor" title={`Edit ${result.period.periodKey}`} /><div className="grid gap-6 lg:grid-cols-2">{result.groups.map((group) => <Card key={group.id}><CardHeader><CardTitle>{group.name}</CardTitle></CardHeader><CardContent className="space-y-6">{group.items.map((item) => <div className="border-b border-border pb-5 last:border-0 last:pb-0" key={item.id}><ActionForm action={updateBudgetItemAction} className="space-y-3"><input name="periodId" type="hidden" value={period} /><input name="id" type="hidden" value={item.id} /><input className="h-10 w-full border-b border-input bg-transparent text-sm" defaultValue={item.name} name="name" required /><input className="h-10 w-full border-b border-input bg-transparent text-sm" defaultValue={item.allocatedAmount} min="0" name="allocatedAmount" type="number" required /><textarea className="min-h-16 w-full border border-input bg-transparent p-3 text-sm" defaultValue={item.notes ?? ""} name="notes" placeholder="Notes" /><Button size="sm" type="submit">Save item</Button></ActionForm><ActionForm action={reviseBudgetItemAction} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end"><input name="periodId" type="hidden" value={period} /><input name="id" type="hidden" value={item.id} /><label className="flex-1 space-y-1 text-xs text-muted-foreground">New allocation<input className="h-9 w-full border-b border-input bg-transparent text-sm" min="0" name="allocatedAmount" type="number" required /></label><label className="flex-1 space-y-1 text-xs text-muted-foreground">Revision reason<input className="h-9 w-full border-b border-input bg-transparent text-sm" name="reason" required /></label><Button size="sm" variant="outline" type="submit">Record revision</Button></ActionForm></div>)}<ActionForm action={createBudgetItemAction} className="space-y-3 border-t border-border pt-5"><input name="periodId" type="hidden" value={period} /><input name="groupId" type="hidden" value={group.id} /><input className="h-10 w-full border-b border-input bg-transparent text-sm" name="name" placeholder="New allocation item" required /><input className="h-10 w-full border-b border-input bg-transparent text-sm" min="0" name="allocatedAmount" placeholder="Amount" type="number" required /><textarea className="min-h-16 w-full border border-input bg-transparent p-3 text-sm" name="notes" placeholder="Notes" /><Button size="sm" type="submit">Add item</Button></ActionForm></CardContent></Card>)}</div></div></PageContainer>;
}
