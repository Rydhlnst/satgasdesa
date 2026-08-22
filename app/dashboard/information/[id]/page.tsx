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
  const blockLabel = result.item.blockId ? blocks.find((block) => block.id === result.item.blockId)?.code ?? "Blok terkait" : "Tanpa blok";
  const status = result.item.status as DailyInformationStatus;
  const transitions = DAILY_INFORMATION_TRANSITIONS[status] ?? [];

  return (
    <PageContainer>
      <div className="space-y-8">
        <PageHeader
          breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Informasi harian", href: "/dashboard/information" }, { label: "Detail" }]}
          description={`${result.item.category.replaceAll("_", " ")} · dilaporkan ${result.item.reportedAt.toLocaleDateString("id-ID")}`}
          eyebrow="Operasional lapangan"
          title={blockLabel}
          actions={<div className="flex items-center gap-2"><StatusBadge status={result.item.priority} /><StatusBadge status={result.item.status} /></div>}
        />

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-8">
            <Card className="shadow-sm">
              <CardHeader><CardTitle className="font-heading text-xl uppercase tracking-wide">Informasi</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <Field label="Uraian" value={result.item.description} />
                <Field label="Dokumentasi" value={result.item.documentation} />
                <Field label="Tindak lanjut saat ini" value={result.item.followUp} />
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader><CardTitle className="font-heading text-xl uppercase tracking-wide">Linimasa tindak lanjut</CardTitle></CardHeader>
              <CardContent>
                {result.followUps.length ? <div className="divide-y divide-border">{result.followUps.map((followUp) => <article className="py-4 first:pt-0 last:pb-0" key={followUp.id}><time className="text-xs text-muted-foreground" dateTime={followUp.createdAt.toISOString()}>{followUp.createdAt.toLocaleDateString("id-ID")}</time><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{followUp.note}</p></article>)}</div> : <EmptyState description="Catatan tindak lanjut akan muncul setelah ada tindakan pada informasi ini." title="Belum ada tindak lanjut" />}
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader><CardTitle className="font-heading text-xl uppercase tracking-wide">Lampiran</CardTitle></CardHeader>
              <CardContent><AttachmentList attachments={result.attachments} id={result.item.id} /></CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            {canUpdate ? <><TransitionInformationForm id={result.item.id} statuses={transitions} /><FollowUpForm id={result.item.id} /></> : <Card className="shadow-sm"><CardContent className="p-6"><p className="text-sm leading-relaxed text-muted-foreground">Anda dapat melihat data ini, tetapi akun Anda tidak memiliki izin untuk memperbarui alurnya.</p></CardContent></Card>}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return <div><p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{value || "Belum dicatat"}</p></div>;
}
