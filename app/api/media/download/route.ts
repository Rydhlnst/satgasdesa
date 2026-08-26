import path from "node:path";

import { readLocalStorageObject, verifyMediaToken } from "@/src/lib/storage";
import { checkRateLimit, rateLimitedResponse, requestAddress } from "@/src/lib/rate-limit";

export const runtime = "nodejs";

function contentTypeFor(key: string): string {
  const extension = path.extname(key).toLowerCase();
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  if (extension === ".pdf") return "application/pdf";
  return "image/jpeg";
}

export async function GET(request: Request) {
  const rate = checkRateLimit(`media-download:${requestAddress(request)}`, 120, 60_000);
  if (!rate.allowed) return rateLimitedResponse(rate.retryAfterSeconds);
  const url = new URL(request.url);
  const key = url.searchParams.get("key") ?? "";
  const expiresAt = Number(url.searchParams.get("expires"));
  const signature = url.searchParams.get("signature") ?? "";
  if (!verifyMediaToken("download", key, expiresAt, signature)) return Response.json({ error: "DOWNLOAD_URL_EXPIRED", message: "Download URL is invalid or expired." }, { status: 403 });
  try {
    const body = await readLocalStorageObject(key);
    return new Response(new Uint8Array(body), { headers: { "Cache-Control": "private, max-age=300", "Content-Type": contentTypeFor(key) } });
  } catch {
    return Response.json({ error: "MEDIA_NOT_FOUND", message: "Media file was not found." }, { status: 404 });
  }
}
