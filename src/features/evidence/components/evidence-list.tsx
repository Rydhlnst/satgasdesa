"use client";

import { useState } from "react";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getRealizationEvidenceDownloadAction } from "@/app/dashboard/realizations/_actions";
import { getTransactionEvidenceDownloadAction } from "@/app/dashboard/finance/_actions";

type EvidenceItem = { id: string; storageKey: string; contentType: string | null; sizeBytes: number | null; createdAt: Date };
type EvidenceListProps = { kind: "transaction" | "realization"; entityId: string; items: EvidenceItem[] };

export function EvidenceList({ kind, entityId, items }: EvidenceListProps) {
  const [pending, setPending] = useState<string | null>(null);
  async function open(item: EvidenceItem) {
    setPending(item.id);
    try {
      const result = kind === "transaction" ? await getTransactionEvidenceDownloadAction({ transactionId: entityId, evidenceId: item.id }) : await getRealizationEvidenceDownloadAction({ realizationId: entityId, evidenceId: item.id });
      window.open(result.url, "_blank", "noopener,noreferrer");
    } finally { setPending(null); }
  }
  return <div className="divide-y divide-border">{items.map((item) => <div className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0" key={item.id}><div className="min-w-0"><p className="truncate text-sm font-medium">{item.storageKey.split("/").pop()}</p><p className="mt-1 text-xs text-muted-foreground">{item.contentType ?? "File"} · {item.sizeBytes ? `${Math.round(item.sizeBytes / 1024)} KB` : "Unknown size"}</p></div><Button disabled={pending === item.id} onClick={() => void open(item)} size="xs" variant="outline">{pending === item.id ? "Loading…" : <><Download aria-hidden="true" />Open</>}</Button></div>)}</div>;
}
