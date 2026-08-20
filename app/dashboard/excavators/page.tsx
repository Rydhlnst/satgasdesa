import Link from "next/link";

import { ArrowRight, HardHat } from "lucide-react";

import { PageContainer } from "@/components/app-shell/page-container";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { hasPermission, requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";
import { getBlocks } from "@/src/features/blocks/actions";
import { EXCAVATOR_STATUSES } from "@/src/features/excavators/constants";
import { getExcavatorPage } from "@/src/features/excavators/service";

export const dynamic = "force-dynamic";

type ExcavatorsPageProps = {
  searchParams: Promise<{ query?: string; status?: string; blockId?: string }>;
};

function validStatus(value: string | undefined): (typeof EXCAVATOR_STATUSES)[number] | undefined {
  return EXCAVATOR_STATUSES.includes(value as (typeof EXCAVATOR_STATUSES)[number]) ? value as (typeof EXCAVATOR_STATUSES)[number] : undefined;
}

function validUuid(value: string | undefined): string | undefined {
  return value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : undefined;
}

export default async function ExcavatorsPage({ searchParams }: ExcavatorsPageProps) {
  const params = await searchParams;
  const session = await requirePermission(PERMISSIONS.EXCAVATOR_READ);
  const canManage = await hasPermission(session.user.id, PERMISSIONS.EXCAVATOR_MANAGE);
  const canReadBlocks = await hasPermission(session.user.id, PERMISSIONS.BLOCK_READ);
  const status = validStatus(params.status);
  const filters = { query: params.query?.trim() || undefined, status, blockId: validUuid(params.blockId) };
  const [result, blocks] = await Promise.all([getExcavatorPage(filters), canReadBlocks ? getBlocks() : Promise.resolve([])]);

  return (
    <PageContainer>
      <div className="space-y-8">
        <PageHeader actions={canManage ? <Button asChild><Link href="/dashboard/excavators/new">Register excavator</Link></Button> : undefined} breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Excavator" }]} description="Track each excavator as an individual unit, including its current block and movement history." eyebrow="Operational core" title="Excavators" />

        <form className="grid gap-3 border-y border-border py-4 sm:grid-cols-[minmax(0,1fr)_180px_220px_auto]" method="get">
          <label className="sr-only" htmlFor="query">Search excavators</label><input className="h-10 border-b border-input bg-transparent px-0 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring" defaultValue={params.query ?? ""} id="query" name="query" placeholder="Search unit, brand, or model" />
          <select aria-label="Filter by excavator status" className="h-10 border-b border-input bg-transparent px-0 text-sm" defaultValue={status ?? ""} name="status"><option value="">All statuses</option>{EXCAVATOR_STATUSES.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select>
          <select aria-label="Filter by current block" className="h-10 border-b border-input bg-transparent px-0 text-sm" defaultValue={params.blockId ?? ""} name="blockId"><option value="">All blocks</option>{blocks.map((block) => <option key={block.id} value={block.id}>{block.code} · {block.name}</option>)}</select>
          <Button type="submit" variant="outline">Filter</Button>
        </form>

        {result.pagination.total === 0 ? <section className="rounded-xl border border-border bg-card shadow-sm"><EmptyState description="Register the first excavator or adjust the filters." icon={HardHat} title="No excavators found" /></section> : (
          <>
            <section className="hidden overflow-x-auto rounded-xl border border-border bg-card shadow-sm md:block">
              <table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-[0.16em] text-muted-foreground"><tr><th className="px-5 py-4 font-semibold">Unit</th><th className="px-5 py-4 font-semibold">Status</th><th className="px-5 py-4 font-semibold">Operator</th><th className="px-5 py-4 font-semibold">Current block</th><th className="px-5 py-4 text-right font-semibold">Action</th></tr></thead><tbody className="divide-y divide-border">{result.rows.map((row) => { const item = row.excavator; const currentBlock = row.block; return <tr key={item.id}><td className="px-5 py-5"><p className="font-semibold">{item.unitCode}</p><p className="mt-1 text-xs text-muted-foreground">{item.brand} · {item.model}</p></td><td className="px-5 py-5"><StatusBadge status={item.status} /></td><td className="px-5 py-5 text-muted-foreground">{item.operatorName ?? "Not assigned"}</td><td className="px-5 py-5">{currentBlock ? `${currentBlock.code} · ${currentBlock.name}` : "Not assigned"}</td><td className="px-5 py-5 text-right"><Button asChild size="xs" variant="ghost"><Link href={`/dashboard/excavators/${item.id}`}>Open <ArrowRight aria-hidden="true" /></Link></Button></td></tr>; })}</tbody></table>
            </section>
            <section className="space-y-3 md:hidden">{result.rows.map((row) => { const item = row.excavator; const currentBlock = row.block; return <article className="rounded-xl border border-border bg-card p-4 shadow-sm" key={item.id}><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{item.unitCode}</p><p className="mt-1 text-xs text-muted-foreground">{item.brand} · {item.model}</p></div><StatusBadge status={item.status} /></div><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-muted-foreground">Operator</dt><dd className="mt-1">{item.operatorName ?? "Not assigned"}</dd></div><div><dt className="text-xs text-muted-foreground">Block</dt><dd className="mt-1">{currentBlock?.code ?? "Not assigned"}</dd></div></dl><Button asChild className="mt-4 w-full" variant="outline"><Link href={`/dashboard/excavators/${item.id}`}>Open excavator</Link></Button></article>; })}</section>
          </>
        )}
      </div>
    </PageContainer>
  );
}
