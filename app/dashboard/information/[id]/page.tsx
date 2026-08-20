import { notFound } from "next/navigation";

import { PageContainer } from "@/components/app-shell/page-container";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AttachmentList } from "@/src/features/daily-information/components/attachment-list";
import { FollowUpForm, TransitionInformationForm } from "@/src/features/daily-information/components/workflow-forms";
import { DAILY_INFORMATION_TRANSITIONS, type DailyInformationStatus } from "@/src/features/daily-information/constants";
import { getDailyInformationItem } from "@/src/features/daily-information/service";
import { getBlocks } from "@/src/features/blocks/actions";
import { hasPermission, requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";

type InformationDetailPageProps = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export default async function InformationDetailPage({ params }: InformationDetailPageProps) {
  const { id } = await params;
  const session = await requirePermission(PERMISSIONS.DAILY_INFO_READ);
  const result = await getDailyInformationItem(id);
  if (!result) notFound();
  const canUpdate = await hasPermission(session.user.id, PERMISSIONS.DAILY_INFO_UPDATE);
  const canReadBlocks = await hasPermission(session.user.id, PERMISSIONS.BLOCK_READ);
  const blocks = canReadBlocks ? await getBlocks() : [];
  const blockLabel = result.item.blockId ? blocks.find((block) => block.id === result.item.blockId)?.code ?? "Linked block" : "No block linked";
  const status = result.item.status as DailyInformationStatus;
  const transitions = DAILY_INFORMATION_TRANSITIONS[status] ?? [];

  return <PageContainer><div className="space-y-8"><PageHeader breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Daily information", href: "/dashboard/information" }, { label: "Detail" }]} description={`${result.item.category.replaceAll("_", " ")} · reported ${result.item.reportedAt.toLocaleDateString("en-GB")}`} eyebrow="Information detail" title={blockLabel} actions={<div className="flex items-center gap-2"><StatusBadge status={result.item.priority} /><StatusBadge status={result.item.status} /></div>} /><div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]"><div className="space-y-8"><Card className="shadow-sm"><CardHeader><CardTitle className="font-heading text-xl uppercase tracking-wide">Report</CardTitle></CardHeader><CardContent className="space-y-6"><Field label="Description" value={result.item.description} /><Field label="Documentation" value={result.item.documentation} /><Field label="Current follow-up" value={result.item.followUp} /></CardContent></Card><Card className="shadow-sm"><CardHeader><CardTitle className="font-heading text-xl uppercase tracking-wide">Follow-up timeline</CardTitle></CardHeader><CardContent>{result.followUps.length ? <div className="divide-y divide-border">{result.followUps.map((followUp) => <article className="py-4 first:pt-0 last:pb-0" key={followUp.id}><time className="text-xs text-muted-foreground" dateTime={followUp.createdAt.toISOString()}>{followUp.createdAt.toLocaleDateString("en-GB")}</time><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{followUp.note}</p></article>)}</div> : <EmptyState description="No follow-up note has been recorded." title="No follow-up history" />}</CardContent></Card><Card className="shadow-sm"><CardHeader><CardTitle className="font-heading text-xl uppercase tracking-wide">Attachments</CardTitle></CardHeader><CardContent>{result.attachments.length ? <AttachmentList attachments={result.attachments} id={result.item.id} /> : <EmptyState description="No attachments have been added to this record." title="No attachments" />}</CardContent></Card></div><div className="space-y-8">{canUpdate ? <><TransitionInformationForm id={result.item.id} statuses={transitions} /><FollowUpForm id={result.item.id} /></> : <Card className="shadow-sm"><CardContent className="p-6"><p className="text-sm leading-relaxed text-muted-foreground">You can view this record, but your account cannot update its workflow.</p></CardContent></Card>}</div></div></div></PageContainer>;
}

function Field({ label, value }: { label: string; value: string | null }) { return <div><p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{value || "Not recorded"}</p></div>; }
