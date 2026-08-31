import { describeError } from "../lib/feedback";

export type SyncFailure = { retryable: boolean; message: string; status: number | null; code: string | null; requestId?: string };

export function classifySyncError(error: unknown): SyncFailure {
  const details = describeError(error, "Sinkronisasi gagal. Periksa data lalu coba lagi.");
  const message = details.reason;
  const status = typeof error === "object" && error !== null && "status" in error && typeof error.status === "number" ? error.status : null;
  const code = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" ? error.code : null;
  if (status !== null) return { retryable: status === 408 || status === 425 || status === 429 || status >= 500, message, status, code, requestId: details.requestId };
  return { retryable: /network|fetch|connection|koneksi|timeout|terhubung|internet|offline|tidak dapat terhubung/i.test(message), message, status: null, code: code ?? "NETWORK_ERROR", requestId: details.requestId };
}
