import { Directory, File, Paths } from "expo-file-system";
import { optimizeImageUri } from "../lib/media";

export type QueuedMedia = {
  uri: string;
  name: string;
  contentType: string;
  sizeBytes: number;
  capturedAt?: string;
};

export type MediaAsset = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
};

export async function persistQueuedMedia(queueId: string, assets: MediaAsset[]): Promise<QueuedMedia[]> {
  const directory = new Directory(Paths.document, "sync-outbox", queueId);
  if (!directory.exists) directory.create({ intermediates: true });
  return Promise.all(assets.map(async (asset, index) => {
    const image = await optimizeImageUri(asset.uri, `attachment-${index + 1}`, asset.fileName ?? undefined);
    const target = new File(directory, `${index + 1}-${Date.now()}.jpg`);
    new File(image.uri).copy(target);
    const sizeBytes = target.size ?? image.sizeBytes;
    if (!sizeBytes) throw new Error("Unable to preserve an attachment for offline sync.");
    return { uri: target.uri, name: image.name, contentType: image.contentType, sizeBytes, capturedAt: new Date().toISOString() };
  }));
}

export async function removeQueuedMedia(queueId: string): Promise<void> {
  const directory = new Directory(Paths.document, "sync-outbox", queueId);
  if (directory.exists) directory.delete();
}
