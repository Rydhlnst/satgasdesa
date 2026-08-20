import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { PageContainer } from "@/components/app-shell/page-container";
import { hasPermission, requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";
import { createBlock, getBlocks } from "@/src/features/blocks/actions";
import { BlockForm } from "@/src/features/blocks/components/block-form";

export const dynamic = "force-dynamic";

type BlocksPageProps = {
  searchParams: Promise<{ q?: string; status?: string }>;
};

const statusVariant = (status: string) => (status === "STOPPED" ? "destructive" : status === "ACTIVE" ? "default" : "secondary");

export default async function BlocksPage({ searchParams }: BlocksPageProps) {
  const params = await searchParams;
  const session = await requirePermission(PERMISSIONS.BLOCK_READ);
  const [blocks, canCreate] = await Promise.all([
    getBlocks(params.q, params.status),
    hasPermission(session.user.id, PERMISSIONS.BLOCK_CREATE),
  ]);

  return (
    <PageContainer>
      <div className="space-y-8">
        <header className="border-b border-border pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Operational core</p>
          <h1 className="mt-2 font-heading text-3xl font-semibold uppercase tracking-wide">Block monitoring</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Monitor operating status, location, staffing, and field ownership for each registered block.
          </p>
        </header>

        <form className="flex flex-col gap-3 border-y border-border py-4 sm:flex-row" method="get">
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Search by code or name"
            className="h-10 flex-1 border-b border-input bg-transparent px-0 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring"
          />
          <select
            name="status"
            defaultValue={params.status ?? ""}
            className="h-10 border-b border-input bg-transparent px-0 text-sm outline-none focus-visible:border-ring sm:w-48"
            aria-label="Filter by block status"
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="STOPPED">Stopped</option>
            <option value="NOT_OPERATING">Not operating</option>
          </select>
          <Button type="submit" variant="outline">
            Filter
          </Button>
        </form>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-xl border border-border bg-card shadow-sm">
            {blocks.length === 0 ? (
              <Empty className="min-h-72 border-0">
                <EmptyHeader>
                  <EmptyTitle>No blocks found</EmptyTitle>
                  <EmptyDescription>Adjust the filter or create the first block record.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    <tr>
                      <th className="px-5 py-4 font-semibold">Block</th>
                      <th className="px-5 py-4 font-semibold">Status</th>
                      <th className="px-5 py-4 font-semibold">Workers</th>
                      <th className="px-5 py-4 font-semibold">PIC</th>
                      <th className="px-5 py-4 text-right font-semibold">View</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {blocks.map((item) => (
                      <tr key={item.id}>
                        <td className="px-5 py-5">
                          <p className="font-semibold">{item.code}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{item.name}</p>
                        </td>
                        <td className="px-5 py-5">
                          <Badge variant={statusVariant(item.status)}>{item.status.replace("_", " ")}</Badge>
                        </td>
                        <td className="px-5 py-5">{item.workerCount}</td>
                        <td className="px-5 py-5 text-xs text-muted-foreground">{item.fieldPicName ?? "Not assigned"}</td>
                        <td className="px-5 py-5 text-right">
                          <Button asChild size="xs" variant="ghost">
                            <Link href={`/dashboard/blocks/${item.id}`}>Open</Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {canCreate ? <BlockForm action={createBlock} submitLabel="Create block" /> : null}
        </div>
      </div>
    </PageContainer>
  );
}
