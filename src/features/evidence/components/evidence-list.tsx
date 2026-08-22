"use client";

import { useState } from "react";
import Image from "next/image";
import { Download, Eye, FileText, ImageIcon } from "lucide-react";
import { toast } from "sonner";

import { getRealizationEvidenceDownloadAction } from "@/app/dashboard/realizations/_actions";
import { getTransactionEvidenceDownloadAction } from "@/app/dashboard/finance/_actions";
import { getActionErrorMessage } from "@/components/shared/action-form";
import { EmptyState, ErrorState } from "@/components/shared/ui-state";
import { Button } from "@/components/ui/button";

type EvidenceItem = { id: string; storageKey: string; contentType: string | null; sizeBytes: number | null; createdAt: Date };
type EvidenceListProps = { kind: "transaction" | "realization"; entityId: string; items: EvidenceItem[] };

export function EvidenceList({ kind, entityId, items }: EvidenceListProps) {
  const [pending, setPending] = useState<string | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function loadPreview(item: EvidenceItem) {
    if (urls[item.id]) return;
    setPending(item.id);
    setError(null);
    try {
      const result = kind === "transaction" ? await getTransactionEvidenceDownloadAction({ transactionId: entityId, evidenceId: item.id }) : await getRealizationEvidenceDownloadAction({ realizationId: entityId, evidenceId: item.id });
      setUrls((current) => ({ ...current, [item.id]: result.url }));
      toast.success("Evidence siap dibuka.");
    } catch (downloadError) {
      const message = getActionErrorMessage(downloadError);
      setError(message);
      toast.error(message);
    } finally {
      setPending(null);
    }
  }

  if (!items.length) return <EmptyState description="Bukti pendukung akan muncul setelah ditambahkan." title="Belum ada evidence" variant="inline" />;

  return <div className="space-y-3">{error ? <ErrorState description={error} variant="inline" /> : null}<div className="divide-y divide-border">{items.map((item) => { const url = urls[item.id]; const isImage = item.contentType?.startsWith("image/") ?? false; const filename = item.storageKey.split("/").pop() ?? "evidence"; return <div className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0" key={item.id}><div className="flex min-w-0 items-center gap-3"><div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted/50">{url && isImage ? <Image alt={`Pratinjau ${filename}`} className="size-full object-cover" height={40} loading="lazy" src={url} unoptimized width={40} /> : isImage ? <ImageIcon aria-hidden="true" className="size-4 text-muted-foreground" /> : <FileText aria-hidden="true" className="size-4 text-muted-foreground" />}</div><div className="min-w-0"><p className="truncate text-sm font-medium">{filename}</p><p className="mt-1 text-xs text-muted-foreground">{item.contentType ?? "File"} · {item.sizeBytes ? `${Math.round(item.sizeBytes / 1024)} KB` : "Tidak diketahui"}</p></div></div><div className="flex items-center gap-2">{url ? <Button asChild className="min-h-11" size="xs" variant="outline"><a href={url} rel="noreferrer" target="_blank"><Download aria-hidden="true" />Buka</a></Button> : <Button className="min-h-11" disabled={pending === item.id} onClick={() => void loadPreview(item)} size="xs" variant="outline">{pending === item.id ? "Memuat…" : <><Eye aria-hidden="true" />Pratinjau</>}</Button>}</div>{url && isImage ? <a className="basis-full overflow-hidden rounded-xl border border-border bg-muted/20" href={url} rel="noreferrer" target="_blank"><Image alt={`Pratinjau ${filename}`} className="max-h-72 w-full object-contain" height={720} loading="lazy" src={url} unoptimized width={1200} /></a> : null}</div>; })}</div></div>;
}
