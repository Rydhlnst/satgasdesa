"use client";

import { useState } from "react";

import { getInspectionPhotoDownloadAction } from "@/app/dashboard/inspections/_actions";
import { Button } from "@/components/ui/button";

type InspectionPhoto = { storageKey: string; contentType: string; sizeBytes: number; capturedAt: Date | null };

export function InspectionPhotoList({ inspectionId, photos }: { inspectionId: string; photos: InspectionPhoto[] }) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  async function loadPhoto(storageKey: string) {
    setPendingKey(storageKey);
    try {
      const result = await getInspectionPhotoDownloadAction({ inspectionId, storageKey });
      setUrls((current) => ({ ...current, [storageKey]: result.downloadUrl }));
    } finally {
      setPendingKey(null);
    }
  }

  return <div className="grid gap-4 sm:grid-cols-3">{photos.map((photo) => <div className="rounded-xl border border-border bg-card p-4" key={photo.storageKey}><p className="truncate text-sm font-medium">{photo.storageKey.split("/").pop()}</p><p className="mt-1 text-xs text-muted-foreground">{photo.contentType} · {Math.round(photo.sizeBytes / 1024)} KB</p>{urls[photo.storageKey] ? <a className="mt-4 inline-flex text-xs font-semibold uppercase tracking-wider underline underline-offset-4" href={urls[photo.storageKey]} rel="noreferrer" target="_blank">Open photo</a> : <Button className="mt-4" disabled={pendingKey === photo.storageKey} onClick={() => void loadPhoto(photo.storageKey)} size="xs" variant="outline">{pendingKey === photo.storageKey ? "Loading…" : "Load photo"}</Button>}</div>)}</div>;
}
