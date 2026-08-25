import { Directory, File, Paths } from "expo-file-system";

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

function extensionFor(contentType: string): string {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

export async function persistQueuedMedia(queueId: string, assets: MediaAsset[]): Promise<QueuedMedia[]> {
  const directory = new Directory(Paths.document, "sync-outbox", queueId);
  if (!directory.exists) directory.create({ intermediates: true });
  return Promise.all(assets.map(async (asset, index) => {
    const contentType = asset.mimeType === "image/png" || asset.mimeType === "image/webp" ? asset.mimeType : "image/jpeg";
    const fallbackName = `attachment-${index + 1}.${extensionFor(contentType)}`;
    const name = asset.fileName?.trim() || fallbackName;
    const target = new File(directory, `${index + 1}-${Date.now()}.${extensionFor(contentType)}`);
    new File(asset.uri).copy(target);
    const sizeBytes = target.size ?? asset.fileSize ?? 0;
    if (!sizeBytes) throw new Error("Unable to preserve an attachment for offline sync.");
    return { uri: target.uri, name, contentType, sizeBytes, capturedAt: new Date().toISOString() };
  }));
}

export async function removeQueuedMedia(queueId: string): Promise<void> {
  const directory = new Directory(Paths.document, "sync-outbox", queueId);
  if (directory.exists) directory.delete();
}
