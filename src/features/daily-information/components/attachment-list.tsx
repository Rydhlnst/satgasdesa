"use client";

import { useState } from "react";
import { toast } from "sonner";

import { getDailyInformationAttachmentDownloadAction } from "@/app/dashboard/information/_actions";
import { getActionErrorMessage } from "@/components/shared/action-form";
import { EmptyState, ErrorState } from "@/components/shared/ui-state";
import { Button } from "@/components/ui/button";

type Attachment = { storageKey: string; contentType: string; sizeBytes: number; createdAt: Date };

export function AttachmentList({ id, attachments }: { id: string; attachments: Attachment[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});

  async function loadAttachment(storageKey: string) {
    setPending(storageKey);
    setError(null);
    try {
      const result = await getDailyInformationAttachmentDownloadAction({ id, storageKey });
      setUrls((current) => ({ ...current, [storageKey]: result.downloadUrl }));
      toast.success("Lampiran siap dibuka.");
    } catch (attachmentError) {
      const message = getActionErrorMessage(attachmentError);
      setError(message);
      toast.error(message);
    } finally {
      setPending(null);
    }
  }

  if (!attachments.length) return <EmptyState description="Lampiran akan muncul setelah ditambahkan." title="Belum ada lampiran" variant="inline" />;

  return <div className="space-y-3">{error ? <ErrorState description={error} variant="inline" /> : null}{attachments.map((attachment) => <div className="flex flex-wrap items-center justify-between gap-3 border border-border p-3" key={attachment.storageKey}><div className="min-w-0"><p className="truncate text-sm font-medium">{attachment.storageKey.split("/").pop()}</p><p className="mt-1 text-xs text-muted-foreground">{attachment.contentType} · {Math.round(attachment.sizeBytes / 1024)} KB</p></div>{urls[attachment.storageKey] ? <a className="inline-flex min-h-11 items-center text-xs font-semibold uppercase tracking-wider underline underline-offset-4" href={urls[attachment.storageKey]} rel="noreferrer" target="_blank">Buka</a> : <Button className="min-h-11" disabled={pending === attachment.storageKey} onClick={() => void loadAttachment(attachment.storageKey)} size="xs" variant="outline">{pending === attachment.storageKey ? "Memuat…" : "Buka"}</Button>}</div>)}</div>;
}
