import NetInfo from "@react-native-community/netinfo";

import {
  createDailyInformation,
  createDailyInformationAttachmentUploadUrl,
  createInspection,
  createInspectionUploadUrl,
} from "../lib/api";

import { persistQueuedMedia, removeQueuedMedia, type MediaAsset, type QueuedMedia } from "./media";
import {
  claimOutboxItem,
  enqueueOutbox,
  getSyncableOutbox,
  initializeOfflineStore,
  markOutboxFailed,
  markOutboxSynced,
  type OutboxItem,
} from "./store";

type InspectionInput = Record<string, unknown>;
type DailyInformationInput = Record<string, unknown>;

export type QueuedInspectionSubmission = {
  input: InspectionInput;
  media: QueuedMedia[];
};

export type QueuedDailyInformationSubmission = {
  input: DailyInformationInput;
  media: QueuedMedia[];
};

type SyncRunResult = { synced: number; failed: number; skipped: boolean };

async function upload(uri: string, uploadUrl: string, contentType: string): Promise<void> {
  const source = await fetch(uri);
  const body = await source.blob();
  const response = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": contentType }, body });
  if (!response.ok) throw new Error("Attachment upload failed.");
}

async function syncInspection(item: OutboxItem<QueuedInspectionSubmission>): Promise<void> {
  const photos = await Promise.all(item.payload.media.map(async (media) => {
    const uploadTarget = await createInspectionUploadUrl({
      inspectionId: item.id,
      contentType: media.contentType,
      size: media.sizeBytes,
      originalName: media.name,
    }) as { key: string; uploadUrl: string };
    await upload(media.uri, uploadTarget.uploadUrl, media.contentType);
    return {
      storageKey: uploadTarget.key,
      contentType: media.contentType,
      size: media.sizeBytes,
      originalName: media.name,
      capturedAt: media.capturedAt,
    };
  }));
  const existingPhotos = Array.isArray(item.payload.input.photos) ? item.payload.input.photos : [];
  await createInspection({ ...item.payload.input, id: item.id, photos: [...existingPhotos, ...photos] });
}

async function syncDailyInformation(item: OutboxItem<QueuedDailyInformationSubmission>): Promise<void> {
  const attachments = await Promise.all(item.payload.media.map(async (media) => {
    const uploadTarget = await createDailyInformationAttachmentUploadUrl({
      id: item.id,
      contentType: media.contentType,
      sizeBytes: media.sizeBytes,
      originalName: media.name,
    }) as { key: string; uploadUrl: string };
    await upload(media.uri, uploadTarget.uploadUrl, media.contentType);
    return { storageKey: uploadTarget.key, contentType: media.contentType, sizeBytes: media.sizeBytes };
  }));
  await createDailyInformation({ ...item.payload.input, id: item.id, attachments });
}

async function syncItem(item: OutboxItem): Promise<void> {
  if (item.operation === "CREATE_INSPECTION") return syncInspection(item as OutboxItem<QueuedInspectionSubmission>);
  if (item.operation === "CREATE_DAILY_INFORMATION") return syncDailyInformation(item as OutboxItem<QueuedDailyInformationSubmission>);
  throw new Error(`Unsupported sync operation: ${item.operation}`);
}

export async function queueInspectionSubmission(id: string, input: InspectionInput, media: MediaAsset[]): Promise<void> {
  const preservedMedia = await persistQueuedMedia(id, media);
  await enqueueOutbox({ id, operation: "CREATE_INSPECTION", payload: { input, media: preservedMedia } satisfies QueuedInspectionSubmission });
}

export async function queueDailyInformationSubmission(id: string, input: DailyInformationInput, media: MediaAsset[]): Promise<void> {
  const preservedMedia = await persistQueuedMedia(id, media);
  await enqueueOutbox({ id, operation: "CREATE_DAILY_INFORMATION", payload: { input, media: preservedMedia } satisfies QueuedDailyInformationSubmission });
}

export async function syncOutbox(force = false): Promise<SyncRunResult> {
  await initializeOfflineStore();
  const connection = await NetInfo.fetch();
  if (!connection.isConnected || connection.isInternetReachable === false) return { synced: 0, failed: 0, skipped: true };

  let synced = 0;
  let failed = 0;
  for (const item of await getSyncableOutbox(force)) {
    if (!await claimOutboxItem(item.id, force)) continue;
    try {
      await syncItem(item);
      await markOutboxSynced(item.id);
      await removeQueuedMedia(item.id);
      synced += 1;
    } catch (error) {
      await markOutboxFailed(item.id, error instanceof Error ? error.message : "Sync failed.", item.retryCount + 1);
      failed += 1;
    }
  }
  return { synced, failed, skipped: false };
}
