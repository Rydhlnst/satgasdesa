import { validateUpload, verifyMediaToken, writeLocalStorageObject } from "@/src/lib/storage";

export const runtime = "nodejs";

export async function PUT(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key") ?? "";
  const contentType = url.searchParams.get("contentType") ?? request.headers.get("content-type") ?? "";
  const expiresAt = Number(url.searchParams.get("expires"));
  const signature = url.searchParams.get("signature") ?? "";
  if (!verifyMediaToken("upload", key, expiresAt, signature, contentType)) return Response.json({ error: "UPLOAD_URL_EXPIRED", message: "Upload URL is invalid or expired." }, { status: 403 });

  const body = new Uint8Array(await request.arrayBuffer());
  try {
    validateUpload({ contentType, size: body.byteLength, originalName: key.split("/").at(-1) ?? "upload" });
    await writeLocalStorageObject(key, body);
    return Response.json({ ok: true, key });
  } catch (error) {
    return Response.json({ error: "UPLOAD_REJECTED", message: error instanceof Error ? error.message : "Upload rejected." }, { status: 400 });
  }
}
