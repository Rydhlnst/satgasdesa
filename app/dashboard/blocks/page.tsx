import Link from "next/link";

import { Search, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/app-shell/page-container";
import { EmptyState, NoResultsState } from "@/components/shared/ui-state";
import { LazyGoogleMap } from "@/components/shared/google-map-lazy";
import type { GoogleMapMarker } from "@/components/shared/google-map";
import { hasPermission, requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";
import { createBlock, getBlocks } from "@/src/features/blocks/actions";
import { BlockForm } from "@/src/features/blocks/components/block-form";
import { MOBILE_SURFACE } from "@/src/lib/ui/mobile-tokens";

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
  const mapBlock = blocks[0];
  const hasFilters = Boolean(params.q?.trim() || params.status);
  const statusCounts = {
    active: blocks.filter((item) => item.status === "ACTIVE").length,
    stopped: blocks.filter((item) => item.status === "STOPPED").length,
    notOperating: blocks.filter((item) => item.status === "NOT_OPERATING").length,
  };
  const mapMarkers: GoogleMapMarker[] = blocks.map((item) => ({ id: item.id, label: item.code, latitude: item.latitude, longitude: item.longitude, status: item.status }));

  return (
    <PageContainer>
      <div className="space-y-8">
        <header className="hidden border-b border-border pb-6 md:block">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Operational core</p>
          <h1 className="mt-2 font-heading text-3xl font-semibold uppercase tracking-wide">Block monitoring</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Monitor operating status, location, staffing, and field ownership for each registered block.
          </p>
        </header>

        <form className="hidden flex-col gap-3 border-y border-border py-4 sm:flex-row md:flex" method="get">
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

        <form className="flex gap-2 md:hidden" method="get">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-[#dfe4ec] bg-white px-3 shadow-sm">
            <Search aria-hidden="true" className="size-4 shrink-0 text-[#7c8798]" />
            <input aria-label="Cari blok" className="h-10 min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-[#8c96a5]" defaultValue={params.q ?? ""} name="q" placeholder="Cari blok..." />
          </label>
          <Button aria-label="Buka filter" className="h-10 w-10 rounded-lg border-[#dfe4ec] bg-white p-0 text-[#173a7d] shadow-sm" size="icon" type="submit" variant="outline"><SlidersHorizontal className="size-4" /></Button>
        </form>

        <section className="space-y-3 md:hidden">
          <div className="flex items-center justify-between"><div><p className="text-sm font-extrabold text-[#142d60]">Peta Blok</p><p className="text-[10px] text-[#788393]">Persebaran {blocks.length} blok</p></div><Button asChild className="h-8 rounded-lg border-[#dfe4ec] bg-white px-2.5 text-[10px] text-[#173a7d] shadow-sm" variant="outline"><Link href="#block-list">Daftar</Link></Button></div>
          {mapBlock ? <LazyGoogleMap latitude={mapBlock.latitude} longitude={mapBlock.longitude} markers={mapMarkers} title="Peta Blok" description={`${blocks.length} blok terdaftar · lokasi real-time`} heightClassName="h-[360px]" /> : <div className="rounded-2xl border border-border bg-card">{hasFilters ? <NoResultsState description="Coba ubah kata kunci atau hapus filter untuk melihat blok lain." title="Blok tidak ditemukan" /> : <EmptyState title="Belum ada lokasi blok" description="Tambahkan blok pertama untuk menampilkan peta operasional." />}</div>}
          <div className={MOBILE_SURFACE.cardPadded}><p className="text-xs font-bold text-[#142d60]">Legenda Status Blok</p><div className="mt-3 grid grid-cols-2 gap-y-2 text-[10px] text-[#596579]"><span><i className="mr-1.5 inline-block size-2 rounded-full bg-[#16834a]" /> Aktif <b className="float-right text-[#142d60]">{statusCounts.active}</b></span><span><i className="mr-1.5 inline-block size-2 rounded-full bg-[#dc3e38]" /> Berhenti Sementara <b className="float-right text-[#142d60]">{statusCounts.stopped}</b></span><span><i className="mr-1.5 inline-block size-2 rounded-full bg-[#6b7280]" /> Belum Operasi <b className="float-right text-[#142d60]">{statusCounts.notOperating}</b></span><span><i className="mr-1.5 inline-block size-2 rounded-full bg-[#6f3aa8]" /> Prioritas <b className="float-right text-[#142d60]">0</b></span></div></div>
        </section>

        <div className="hidden gap-8 lg:grid-cols-[minmax(0,1fr)_360px] md:grid" id="block-list">
          <section className="rounded-2xl border border-border bg-card shadow-[0_18px_50px_-30px_rgba(15,35,75,0.55)]">
            {blocks.length === 0 ? (
              hasFilters ? <NoResultsState description="Coba ubah kata kunci atau hapus filter untuk melihat data lain." title="Blok tidak ditemukan" /> : <EmptyState description="Tambahkan blok pertama untuk memulai monitoring." title="Belum ada blok" />
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

          <div className="space-y-4">
            {mapBlock ? <LazyGoogleMap latitude={mapBlock.latitude} longitude={mapBlock.longitude} markers={mapMarkers} title="Operational map" description={`${blocks.length} blocks · Google Maps`} heightClassName="h-64" /> : null}
            {canCreate ? <BlockForm action={createBlock} submitLabel="Create block" /> : null}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
