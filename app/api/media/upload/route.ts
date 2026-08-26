import { assertFileSignature, validateUpload, verifyMediaToken, writeLocalStorageObject } from "@/src/lib/storage";
import { checkRateLimit, rateLimitedResponse, requestAddress } from "@/src/lib/rate-limit";

export const runtime = "nodejs";

export async function PUT(request: Request) {
  const rate = checkRateLimit(`media-upload:${requestAddress(request)}`, 60, 60_000);
  if (!rate.allowed) return rateLimitedResponse(rate.retryAfterSeconds);
  const url = new URL(request.url);
  const key = url.searchParams.get("key") ?? "";
  const contentType = url.searchParams.get("contentType") ?? request.headers.get("content-type") ?? "";
  const expiresAt = Number(url.searchParams.get("expires"));
  const signature = url.searchParams.get("signature") ?? "";
  const declaredLength = Number(request.headers.get("content-length") ?? "");
  if (Number.isFinite(declaredLength) && declaredLength > 10 * 1024 * 1024) return Response.json({ error: "UPLOAD_TOO_LARGE", message: "File size must be 10 MB or smaller." }, { status: 413 });
  if (!verifyMediaToken("upload", key, expiresAt, signature, contentType)) return Response.json({ error: "UPLOAD_URL_EXPIRED", message: "Upload URL is invalid or expired." }, { status: 403 });

  const body = new Uint8Array(await request.arrayBuffer());
  try {
    validateUpload({ contentType, size: body.byteLength, originalName: key.split("/").at(-1) ?? "upload" });
    assertFileSignature(contentType.trim().toLowerCase(), body);
    await writeLocalStorageObject(key, body);
    return Response.json({ ok: true, key });
  } catch (error) {
    return Response.json({ error: "UPLOAD_REJECTED", message: error instanceof Error ? error.message : "Upload rejected." }, { status: 400 });
  }
}
