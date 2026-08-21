import Link from "next/link";
import { Bell } from "lucide-react";
import { PageContainer } from "@/components/app-shell/page-container";
import { ActionForm } from "@/components/shared/action-form";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { getMyNotifications } from "@/src/features/notifications/service";
import { markAllNotificationsReadAction, markNotificationReadAction } from "./_actions";

export const dynamic = "force-dynamic";
type Props = { searchParams: Promise<{ unread?: string; query?: string }> };

export default async function NotificationsPage({ searchParams }: Props) {
  const params = await searchParams;
  const unreadOnly = params.unread === "true";
  const result = await getMyNotifications({ unreadOnly, query: params.query?.trim() || undefined });
  return <PageContainer><div className="space-y-8"><PageHeader breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Notifications" }]} description="Pemberitahuan dari alur operasional, iuran, anggaran, dan realisasi." eyebrow="Ruang kerja" title="Notifikasi" actions={<ActionForm action={markAllNotificationsReadAction}><Button type="submit" variant="outline">Tandai semua dibaca</Button></ActionForm>} /><form className="grid gap-3 border-y border-border py-4 sm:grid-cols-[minmax(0,1fr)_180px_auto]" method="get"><input className="h-10 border-b border-input bg-transparent text-sm" defaultValue={params.query ?? ""} name="query" placeholder="Cari notifikasi" /><select className="h-10 border-b border-input bg-transparent text-sm" defaultValue={unreadOnly ? "true" : ""} name="unread"><option value="">Semua notifikasi</option><option value="true">Belum dibaca</option></select><Button type="submit" variant="outline">Filter</Button></form>{result.total === 0 ? <section className="rounded-xl border border-border bg-card"><EmptyState description="Pemberitahuan alur kerja akan muncul di sini." icon={Bell} title="Tidak ada notifikasi" /></section> : <section className="divide-y divide-border rounded-xl border border-border bg-card shadow-sm">{result.items.map((item) => <article className={`p-5 ${item.readAt ? "" : "bg-muted/30"}`} key={item.id}><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{item.title}</h2>{!item.readAt ? <StatusBadge status="URGENT" label="Belum dibaca" /> : null}</div><p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{item.body}</p><p className="mt-2 text-xs text-muted-foreground">{item.createdAt.toLocaleString("id-ID")} · {item.type.replaceAll("_", " ")}</p></div><div className="flex items-center gap-2">{item.relatedEntityType && item.relatedEntityId ? <Button asChild size="xs" variant="ghost"><Link href={item.relatedEntityType === "REALIZATION" ? `/dashboard/realizations/${item.relatedEntityId}` : item.relatedEntityType === "DUE" ? `/dashboard/dues/${item.relatedEntityId}` : item.relatedEntityType === "FINANCIAL_TRANSACTION" ? `/dashboard/finance/transactions/${item.relatedEntityId}` : "/dashboard"}>Buka</Link></Button> : null}{!item.readAt ? <ActionForm action={markNotificationReadAction}><input name="id" type="hidden" value={item.id} /><Button size="xs" type="submit" variant="outline">Tandai dibaca</Button></ActionForm> : null}</div></div></article>)}</section>}</div></PageContainer>;
}
