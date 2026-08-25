import { randomUUID } from "node:crypto";
import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
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

const MEDIA_TOKEN_TTL_SECONDS = 300;

function mediaSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET must be configured for local media storage.");
  return secret;
}

function mediaSignature(operation: "upload" | "download", key: string, expiresAt: number, contentType = ""): string {
  return createHmac("sha256", mediaSecret()).update(`${operation}:${expiresAt}:${contentType}:${key}`).digest("hex");
}

export function verifyMediaToken(operation: "upload" | "download", key: string, expiresAt: number, signature: string, contentType = ""): boolean {
  if (!key || !Number.isSafeInteger(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) return false;
  const expected = mediaSignature(operation, key, expiresAt, contentType);
  if (expected.length !== signature.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

function localStorageRoot(): string {
  const configured = process.env.STORAGE_LOCAL_ROOT ?? "public/uploads";
  return path.resolve(process.cwd(), configured);
}

export function localStoragePath(key: string): string {
  const root = localStorageRoot();
  const resolved = path.resolve(root, key);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) throw new Error("Invalid media storage key.");
  return resolved;
}

export async function writeLocalStorageObject(key: string, body: Uint8Array): Promise<void> {
  const target = localStoragePath(key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, body);
}

export async function readLocalStorageObject(key: string): Promise<Buffer> {
  return readFile(localStoragePath(key));
}

function localMediaUrl(operation: "upload" | "download", key: string, contentType = ""): string {
  const expiresAt = Math.floor(Date.now() / 1000) + MEDIA_TOKEN_TTL_SECONDS;
  const signature = mediaSignature(operation, key, expiresAt, contentType);
  const params = new URLSearchParams({ key, expires: String(expiresAt), signature });
  if (contentType) params.set("contentType", contentType);
  return `/api/media/${operation}?${params.toString()}`;
}

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

class FileSystemObjectStorage implements ObjectStorage {
  async createUploadUrl(input: UploadValidationInput & { scope: string }): Promise<StorageUpload> {
    validateUpload(input);
    const key = createStorageKey(input.scope, input.contentType);
    return { key, uploadUrl: localMediaUrl("upload", key, input.contentType) };
  }

  async createDownloadUrl(key: string): Promise<string> {
    localStoragePath(key);
    return localMediaUrl("download", key);
  }
}

export function getObjectStorage(): ObjectStorage {
  const provider = process.env.STORAGE_PROVIDER ?? "disabled";

  if (provider === "disabled") {
    return new UnconfiguredObjectStorage();
  }
  if (provider === "r2") return new R2ObjectStorage();
  if (provider === "filesystem" || provider === "cpanel") return new FileSystemObjectStorage();

  throw new Error(`Unsupported storage provider: ${provider}`);
}
