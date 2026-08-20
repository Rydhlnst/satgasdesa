import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/app-shell/page-container";
import { hasPermission, requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";
import { getBlock } from "@/src/features/blocks/actions";

export const dynamic = "force-dynamic";

type BlockDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function BlockDetailPage({ params }: BlockDetailPageProps) {
  const { id } = await params;
  const session = await requirePermission(PERMISSIONS.BLOCK_READ);
  const item = await getBlock(id);
  if (!item) notFound();
  const canUpdate = await hasPermission(session.user.id, PERMISSIONS.BLOCK_UPDATE);

  return (
    <PageContainer>
      <div className="space-y-8">
        <header className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/dashboard/blocks" className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground">
              ← All blocks
            </Link>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Block detail</p>
            <h1 className="mt-2 font-heading text-3xl font-semibold uppercase tracking-wide">{item.code}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{item.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={item.status === "STOPPED" ? "destructive" : "default"}>{item.status.replace("_", " ")}</Badge>
            {canUpdate ? (
              <Button asChild size="sm" variant="outline">
                <Link href={`/dashboard/blocks/${item.id}/edit`}>Edit block</Link>
              </Button>
            ) : null}
          </div>
        </header>

        <section className="grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Workers" value={String(item.workerCount)} />
          <Metric label="Condition" value={item.operationalCondition} />
          <Metric label="Manager / operator" value={item.managerName ?? "Not assigned"} />
          <Metric label="Field PIC" value={item.fieldPicName ?? "Not assigned"} />
        </section>

        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Location</p>
            <dl className="mt-5 grid gap-5 sm:grid-cols-2">
              <Detail label="Latitude" value={item.latitude} />
              <Detail label="Longitude" value={item.longitude} />
              <Detail label="Start date" value={item.startDate ?? "Not recorded"} />
              <Detail label="Contact" value={item.contact ?? "Not recorded"} />
              <Detail label="Location PIC" value={item.locationPicName ?? "Not assigned"} />
              <Detail label="Photo key" value={item.locationPhotoKey ?? "Not uploaded"} />
            </dl>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Notes</p>
            <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{item.notes ?? "No notes recorded."}</p>
          </div>
        </section>
      </div>
    </PageContainer>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-card p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-3 text-sm font-semibold leading-relaxed">{value}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</dt>
      <dd className="mt-2 text-sm font-medium">{value}</dd>
    </div>
  );
}
