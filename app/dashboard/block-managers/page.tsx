import { UsersRound } from "lucide-react";
import { PageContainer } from "@/components/app-shell/page-container";
import { ActionForm } from "@/components/shared/action-form";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBlocks } from "@/src/features/blocks/actions";
import { BLOCK_ASSIGNMENT_ROLES } from "@/src/features/block-managers/constants";
import { getBlockManagers } from "@/src/features/block-managers/service";
import { hasPermission, requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";
import { assignBlockManagerAction, closeBlockManagerAction } from "./_actions";

export const dynamic = "force-dynamic";
type Props = { searchParams: Promise<{ blockId?: string }> };

export default async function BlockManagersPage({ searchParams }: Props) {
  const params = await searchParams;
  const session = await requirePermission(PERMISSIONS.BLOCK_READ);
  const canUpdate = await hasPermission(session.user.id, PERMISSIONS.BLOCK_UPDATE);
  const blocks = await getBlocks();
  const selected = blocks.find((item) => item.id === params.blockId) ?? blocks[0];
  const assignments = selected ? await getBlockManagers(selected.id, true) : [];
  return <PageContainer><div className="space-y-8"><PageHeader breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Pengelola blok" }]} description="Atur pengelola, PIC lokasi, dan PIC lapangan dengan riwayat penugasan yang jelas." eyebrow="Tata kelola operasional" title="Pengelola blok" /><form className="flex flex-col gap-3 border-y border-border py-4 sm:flex-row sm:items-end" method="get"><label className="flex-1 space-y-2 text-sm"><span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Blok</span><select className="h-10 w-full border-b border-input bg-transparent" name="blockId" defaultValue={selected?.id ?? ""}>{blocks.map((block) => <option key={block.id} value={block.id}>{block.code} · {block.name}</option>)}</select></label><Button type="submit" variant="outline">Muat penugasan</Button></form>{selected && canUpdate ? <Card className="shadow-sm"><CardHeader><CardTitle>Penugasan baru</CardTitle></CardHeader><CardContent><ActionForm action={assignBlockManagerAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><input name="blockId" type="hidden" value={selected.id} /><select className="h-10 border-b border-input bg-transparent text-sm" name="assignmentRole">{BLOCK_ASSIGNMENT_ROLES.map((role) => <option key={role}>{role}</option>)}</select><input className="h-10 border-b border-input bg-transparent text-sm" name="personName" placeholder="Nama orang" required /><input className="h-10 border-b border-input bg-transparent text-sm" name="contact" placeholder="Kontak" /><input className="h-10 border-b border-input bg-transparent text-sm" name="startedAt" type="date" required /><input className="h-10 border-b border-input bg-transparent text-sm" name="notes" placeholder="Catatan" /><div><Button type="submit">Tetapkan peran</Button></div></ActionForm></CardContent></Card> : null}{!selected ? <section className="rounded-xl border border-border bg-card"><EmptyState description="Buat blok terlebih dahulu sebelum menetapkan peran operasional." icon={UsersRound} title="Belum ada blok" /></section> : assignments.length === 0 ? <section className="rounded-xl border border-border bg-card"><EmptyState description="Riwayat penugasan pengelola atau PIC belum tersedia untuk blok ini." icon={UsersRound} title="Belum ada penugasan" /></section> : <section className="rounded-xl border border-border bg-card shadow-sm"><div className="border-b border-border px-5 py-4"><p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Riwayat penugasan</p><h2 className="mt-1 font-heading text-xl font-semibold uppercase tracking-wide">{selected.code}</h2></div><div className="divide-y divide-border">{assignments.map((assignment) => <article className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between" key={assignment.id}><div><div className="flex flex-wrap items-center gap-2"><StatusBadge status={assignment.assignmentRole} /><p className="font-semibold">{assignment.personName}</p>{!assignment.endedAt ? <StatusBadge status="ACTIVE" label="Aktif" /> : null}</div><p className="mt-2 text-xs text-muted-foreground">{assignment.startedAt} → {assignment.endedAt ?? "Saat ini"}{assignment.contact ? ` · ${assignment.contact}` : ""}</p>{assignment.notes ? <p className="mt-2 text-sm text-muted-foreground">{assignment.notes}</p> : null}</div>{canUpdate && !assignment.endedAt ? <ActionForm action={closeBlockManagerAction} className="flex items-end gap-2"><input name="id" type="hidden" value={assignment.id} /><label className="space-y-1 text-xs text-muted-foreground">Tanggal berakhir<input className="h-9 border-b border-input bg-transparent text-sm" name="endedAt" type="date" required /></label><Button size="sm" type="submit" variant="outline">Tutup</Button></ActionForm> : null}</article>)}</div></section>}</div></PageContainer>;
}
