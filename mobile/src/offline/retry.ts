const RETRY_BASE_DELAY_MS = 15_000;
const RETRY_MAX_DELAY_MS = 15 * 60_000;

export function retryDelayMs(retryCount: number): number {
  return Math.min(RETRY_BASE_DELAY_MS * 2 ** Math.max(0, retryCount - 1), RETRY_MAX_DELAY_MS);
}
