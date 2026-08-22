"use client";

import { useState } from "react";
import { toast } from "sonner";

import { getInspectionPhotoDownloadAction } from "@/app/dashboard/inspections/_actions";
import { getActionErrorMessage } from "@/components/shared/action-form";
import { EmptyState, ErrorState } from "@/components/shared/ui-state";
import { Button } from "@/components/ui/button";

type InspectionPhoto = { storageKey: string; contentType: string; sizeBytes: number; capturedAt: Date | null };

export function InspectionPhotoList({ inspectionId, photos }: { inspectionId: string; photos: InspectionPhoto[] }) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadPhoto(storageKey: string) {
    setPendingKey(storageKey);
    setError(null);
    try {
      const result = await getInspectionPhotoDownloadAction({ inspectionId, storageKey });
      setUrls((current) => ({ ...current, [storageKey]: result.downloadUrl }));
      toast.success("Foto siap dibuka.");
    } catch (photoError) {
      const message = getActionErrorMessage(photoError);
      setError(message);
      toast.error(message);
    } finally {
      setPendingKey(null);
    }
  }

  if (!photos.length) return <EmptyState description="Foto inspeksi akan muncul setelah dikirim." title="Belum ada foto" variant="inline" />;

  return <div className="space-y-3">{error ? <ErrorState description={error} variant="inline" /> : null}<div className="grid gap-4 sm:grid-cols-3">{photos.map((photo) => <div className="rounded-xl border border-border bg-card p-4" key={photo.storageKey}><p className="truncate text-sm font-medium">{photo.storageKey.split("/").pop()}</p><p className="mt-1 text-xs text-muted-foreground">{photo.contentType} · {Math.round(photo.sizeBytes / 1024)} KB</p>{urls[photo.storageKey] ? <a className="mt-4 inline-flex min-h-11 items-center text-xs font-semibold uppercase tracking-wider underline underline-offset-4" href={urls[photo.storageKey]} rel="noreferrer" target="_blank">Buka foto</a> : <Button className="mt-4 min-h-11" disabled={pendingKey === photo.storageKey} onClick={() => void loadPhoto(photo.storageKey)} size="xs" variant="outline">{pendingKey === photo.storageKey ? "Memuat…" : "Muat foto"}</Button>}</div>)}</div></div>;
}
