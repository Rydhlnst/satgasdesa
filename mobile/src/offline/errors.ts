export type SyncFailure = { retryable: boolean; message: string; status: number | null; code: string | null };

export function classifySyncError(error: unknown): SyncFailure {
  const message = error instanceof Error && error.message.trim() ? error.message : "Sync failed. Check the data and try again.";
  const status = typeof error === "object" && error !== null && "status" in error && typeof error.status === "number" ? error.status : null;
  const code = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" ? error.code : null;
  if (status !== null) return { retryable: status === 408 || status === 425 || status === 429 || status >= 500, message, status, code };
  return { retryable: /network|fetch|connection|koneksi|timeout|terhubung|internet|offline/i.test(message), message, status: null, code: code ?? "NETWORK_ERROR" };
}
