import { PageContainer } from "@/components/app-shell/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { getBudgetPeriodDetail, getBudgetPeriods } from "@/src/features/budgets/service";
import { requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";
import { createRealizationAction } from "../_actions";

export const dynamic = "force-dynamic";

export default async function NewRealizationPage() {
  await requirePermission(PERMISSIONS.REALIZATION_CREATE);
  const periods = await getBudgetPeriods({ status: "APPROVED", pageSize: 100 });
  const details = await Promise.all(periods.items.map((period) => getBudgetPeriodDetail(period.id)));
  const items = details.flatMap((detail) => detail.groups.flatMap((group) => group.items.map((item) => ({ ...item, groupName: group.name, periodKey: detail.period.periodKey }))));
  return <PageContainer><div className="space-y-8"><PageHeader breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Realizations", href: "/dashboard/realizations" }, { label: "New" }]} description="Submit an expense request against an approved budget item. Over-allocation remains visible and requires higher approval." eyebrow="Finance" title="New realization" /><section className="max-w-3xl rounded-xl border border-border bg-card p-6 shadow-sm">{items.length ? <form action={createRealizationAction} className="space-y-5"><label className="block space-y-2 text-sm"><span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Budget item</span><select className="h-10 w-full border-b border-input bg-transparent" name="budgetItemId" required><option value="">Select approved budget item</option>{items.map((item) => <option key={item.id} value={item.id}>{item.periodKey} · {item.groupName} · {item.name}</option>)}</select></label><label className="block space-y-2 text-sm"><span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Requested amount</span><input className="h-10 w-full border-b border-input bg-transparent" min="1" name="requestedAmount" type="number" required /></label><label className="block space-y-2 text-sm"><span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Description</span><textarea className="min-h-32 w-full border border-input bg-transparent p-3" name="description" required /></label><label className="block space-y-2 text-sm"><span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Evidence key</span><input className="h-10 w-full border-b border-input bg-transparent" name="evidenceKey" placeholder="You can upload evidence after creation" /></label><Button type="submit">Create draft request</Button></form> : <p className="text-sm text-muted-foreground">No approved budget items are available. Approve a budget period first.</p>}</section></div></PageContainer>;
}
