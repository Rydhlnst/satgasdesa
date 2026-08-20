import { randomUUID } from "node:crypto";
import path from "node:path";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_FILE_TYPES = new Set([...ALLOWED_IMAGE_TYPES, "application/pdf"]);
const EXTENSIONS_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};

export type UploadValidationInput = {
  contentType: string;
  size: number;
  originalName: string;
};

export type StorageUpload = {
  key: string;
  uploadUrl: string;
};

export type ObjectStorage = {
  createUploadUrl(input: UploadValidationInput & { scope: string }): Promise<StorageUpload>;
  createDownloadUrl(key: string): Promise<string>;
};

export function validateUpload(input: UploadValidationInput): void {
  if (!ALLOWED_FILE_TYPES.has(input.contentType)) {
    throw new Error("Unsupported file type.");
  }

  if (!Number.isInteger(input.size) || input.size <= 0 || input.size > MAX_UPLOAD_BYTES) {
    throw new Error("File size must be between 1 byte and 10 MB.");
  }

  const extension = path.extname(input.originalName).toLowerCase();
  const expectedExtension = EXTENSIONS_BY_MIME[input.contentType];

  if (!expectedExtension || extension !== expectedExtension) {
    throw new Error("File extension does not match its content type.");
  }
}

export function validateImageUpload(input: UploadValidationInput): void {
  validateUpload(input);
  if (!ALLOWED_IMAGE_TYPES.has(input.contentType)) {
    throw new Error("Unsupported image type.");
  }
}

export function createStorageKey(scope: string, contentType: string): string {
  const extension = EXTENSIONS_BY_MIME[contentType];

  if (!extension) {
    throw new Error("Unsupported storage content type.");
  }

  const safeScope = scope.replace(/[^a-zA-Z0-9/_-]/g, "-").replace(/^\/+|\/+$/g, "");

  if (!safeScope) {
    throw new Error("Storage scope is required.");
  }

  return `${safeScope}/${randomUUID()}${extension}`;
}

class UnconfiguredObjectStorage implements ObjectStorage {
  async createUploadUrl(): Promise<StorageUpload> {
    throw new Error("Object storage is not configured.");
  }

  async createDownloadUrl(): Promise<string> {
    throw new Error("Object storage is not configured.");
  }
}

class R2ObjectStorage implements ObjectStorage {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    const endpoint = process.env.STORAGE_ENDPOINT?.replace(/\/+$/, "");
    const bucket = process.env.STORAGE_BUCKET;
    const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID;
    const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY;
    if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) throw new Error("Cloudflare R2 storage is not fully configured.");
    this.bucket = bucket;
    this.client = new S3Client({ endpoint, region: process.env.STORAGE_REGION ?? "auto", forcePathStyle: true, credentials: { accessKeyId, secretAccessKey } });
  }

  async createUploadUrl(input: UploadValidationInput & { scope: string }): Promise<StorageUpload> {
    validateUpload(input);
    const key = createStorageKey(input.scope, input.contentType);
    const uploadUrl = await getSignedUrl(this.client, new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: input.contentType }), { expiresIn: 300 });
    return { key, uploadUrl };
  }

  async createDownloadUrl(key: string): Promise<string> {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), { expiresIn: 300 });
  }
}

export function getObjectStorage(): ObjectStorage {
  const provider = process.env.STORAGE_PROVIDER ?? "disabled";

  if (provider === "disabled") {
    return new UnconfiguredObjectStorage();
  }
  if (provider === "r2") return new R2ObjectStorage();

  throw new Error(`Unsupported storage provider: ${provider}`);
}
