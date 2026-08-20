import { History } from "lucide-react";
import { PageContainer } from "@/components/app-shell/page-container";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { getAuditLogs } from "@/src/features/audit/service";
import { AUDIT_ACTIONS } from "@/src/lib/audit";
import { requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";

export const dynamic = "force-dynamic";
type Props = { searchParams: Promise<{ query?: string; action?: string; entityType?: string }> };

function formatAuditValue(value: unknown): string { if (value == null) return "Tidak ada metadata"; return typeof value === "string" ? value : JSON.stringify(value, null, 2); }

export default async function AuditPage({ searchParams }: Props) {
  const params = await searchParams;
  await requirePermission(PERMISSIONS.AUDIT_READ);
  const actions = Object.values(AUDIT_ACTIONS);
  const action = actions.includes(params.action as (typeof actions)[number]) ? params.action : undefined;
  const result = await getAuditLogs({ query: params.query?.trim() || undefined, action, entityType: params.entityType?.trim() || undefined });
  return <PageContainer><div className="space-y-8"><PageHeader breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Audit log" }]} description="Immutable domain activity recorded by the backend services and workflow transitions." eyebrow="Governance" title="Audit log" /><form className="grid gap-3 border-y border-border py-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_180px_180px_auto]" method="get"><input className="h-10 border-b border-input bg-transparent text-sm" defaultValue={params.query ?? ""} name="query" placeholder="Search actor, entity, or ID" /><select className="h-10 border-b border-input bg-transparent text-sm" defaultValue={action ?? ""} name="action"><option value="">All actions</option>{actions.map((item) => <option key={item}>{item}</option>)}</select><input className="h-10 border-b border-input bg-transparent text-sm" defaultValue={params.entityType ?? ""} name="entityType" placeholder="Entity type" /><Button type="submit" variant="outline">Filter</Button></form>{result.pagination.total === 0 ? <section className="rounded-xl border border-border bg-card"><EmptyState description="Recorded changes will appear here." icon={History} title="No audit events" /></section> : <section className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm"><table className="w-full min-w-[1000px] text-left text-sm"><thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-[0.16em] text-muted-foreground"><tr><th className="px-5 py-4">When</th><th className="px-5 py-4">Actor</th><th className="px-5 py-4">Action</th><th className="px-5 py-4">Entity</th><th className="px-5 py-4">Change</th></tr></thead><tbody className="divide-y divide-border">{result.rows.map((row) => <tr key={row.id}><td className="whitespace-nowrap px-5 py-5 text-xs text-muted-foreground">{row.createdAt.toLocaleString("en-GB")}</td><td className="px-5 py-5"><p className="font-medium">{row.actorName ?? "System"}</p><p className="mt-1 text-xs text-muted-foreground">{row.actorEmail ?? row.actorUserId}</p></td><td className="px-5 py-5">{row.action}</td><td className="px-5 py-5"><p className="font-medium">{row.entityType}</p><p className="mt-1 text-xs text-muted-foreground">{row.entityId}</p></td><td className="max-w-md px-5 py-5"><pre className="whitespace-pre-wrap break-words text-xs text-muted-foreground">{formatAuditValue(row.newValues ?? row.metadata)}</pre></td></tr>)}</tbody></table></section>}</div></PageContainer>;
}
