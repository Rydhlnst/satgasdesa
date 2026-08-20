"use client";

import { useState } from "react";
import Image from "next/image";
import { Download, Eye, FileText, ImageIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getRealizationEvidenceDownloadAction } from "@/app/dashboard/realizations/_actions";
import { getTransactionEvidenceDownloadAction } from "@/app/dashboard/finance/_actions";

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
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Evidence preview could not be loaded.");
    } finally { setPending(null); }
  }
  return <div className="space-y-3">{error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}<div className="divide-y divide-border">{items.map((item) => { const url = urls[item.id]; const isImage = item.contentType?.startsWith("image/") ?? false; const filename = item.storageKey.split("/").pop() ?? "evidence"; return <div className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0" key={item.id}><div className="flex min-w-0 items-center gap-3"><div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted/50">{url && isImage ? <Image alt={`Preview ${filename}`} className="size-full object-cover" height={40} loading="lazy" src={url} unoptimized width={40} /> : isImage ? <ImageIcon aria-hidden="true" className="size-4 text-muted-foreground" /> : <FileText aria-hidden="true" className="size-4 text-muted-foreground" />}</div><div className="min-w-0"><p className="truncate text-sm font-medium">{filename}</p><p className="mt-1 text-xs text-muted-foreground">{item.contentType ?? "File"} · {item.sizeBytes ? `${Math.round(item.sizeBytes / 1024)} KB` : "Unknown size"}</p></div></div><div className="flex items-center gap-2">{url ? <Button asChild size="xs" variant="outline"><a href={url} rel="noreferrer" target="_blank"><Download aria-hidden="true" />Open</a></Button> : <Button disabled={pending === item.id} onClick={() => void loadPreview(item)} size="xs" variant="outline">{pending === item.id ? "Loading…" : <><Eye aria-hidden="true" />Preview</>}</Button>}</div>{url && isImage ? <a className="basis-full overflow-hidden rounded-xl border border-border bg-muted/20" href={url} rel="noreferrer" target="_blank"><Image alt={`Evidence ${filename}`} className="max-h-72 w-full object-contain" height={720} loading="lazy" src={url} unoptimized width={1200} /></a> : null}</div>; })}</div></div>;
}
