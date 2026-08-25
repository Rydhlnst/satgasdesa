import * as SQLite from "expo-sqlite";

import { retryDelayMs } from "./retry";

export type OfflineDraftFeature = "inspection" | "daily-information";
export type SyncOperation = "CREATE_INSPECTION" | "CREATE_DAILY_INFORMATION";
export type SyncStatus = "PENDING" | "SYNCING" | "SYNCED" | "FAILED";

export type OfflineDraft<T = unknown> = {
  feature: OfflineDraftFeature;
  payload: T;
  updatedAt: number;
};

export type OutboxItem<T = unknown> = {
  id: string;
  operation: SyncOperation;
  payload: T;
  status: SyncStatus;
  retryCount: number;
  nextAttemptAt: number | null;
  lastError: string | null;
  createdAt: number;
  updatedAt: number;
  syncedAt: number | null;
};

export type OutboxSummary = Record<SyncStatus, number>;

const databasePromise = SQLite.openDatabaseAsync("satgas-offline.db");
let initialized: Promise<void> | null = null;

async function database() {
  return databasePromise;
}

async function ensureOutboxRetryColumn(): Promise<void> {
  const db = await database();
  const columns = await db.getAllAsync<{ name: string }>("PRAGMA table_info(sync_outbox)");
  if (!columns.some((column) => column.name === "next_attempt_at")) {
    await db.execAsync("ALTER TABLE sync_outbox ADD COLUMN next_attempt_at INTEGER");
  }
}

export async function initializeOfflineStore(): Promise<void> {
  if (!initialized) {
    initialized = (async () => {
      const db = await database();
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS offline_draft (
          feature TEXT PRIMARY KEY NOT NULL,
          payload TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS sync_outbox (
          id TEXT PRIMARY KEY NOT NULL,
          operation TEXT NOT NULL,
          payload TEXT NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED')),
          retry_count INTEGER NOT NULL DEFAULT 0,
          last_error TEXT,
          next_attempt_at INTEGER,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          synced_at INTEGER
        );
        CREATE INDEX IF NOT EXISTS sync_outbox_status_created_idx
          ON sync_outbox(status, created_at);
      `);
      await ensureOutboxRetryColumn();
      await db.execAsync("CREATE INDEX IF NOT EXISTS sync_outbox_status_retry_idx ON sync_outbox(status, next_attempt_at, created_at)");
      await purgeSyncedOutbox();
    })();
  }
  return initialized;
}

export async function saveOfflineDraft<T>(feature: OfflineDraftFeature, payload: T): Promise<void> {
  await initializeOfflineStore();
  const now = Date.now();
  const db = await database();
  await db.runAsync(
    `INSERT INTO offline_draft(feature, payload, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(feature) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`,
    feature,
    JSON.stringify(payload),
    now,
  );
}

export async function loadOfflineDraft<T>(feature: OfflineDraftFeature): Promise<OfflineDraft<T> | null> {
  await initializeOfflineStore();
  const db = await database();
  const [row] = await db.getAllAsync<{ feature: OfflineDraftFeature; payload: string; updated_at: number }>(
    "SELECT feature, payload, updated_at FROM offline_draft WHERE feature = ? LIMIT 1",
    feature,
  );
  if (!row) return null;
  try {
    return { feature: row.feature, payload: JSON.parse(row.payload) as T, updatedAt: row.updated_at };
  } catch {
    await clearOfflineDraft(feature);
    return null;
  }
}

export async function clearOfflineDraft(feature: OfflineDraftFeature): Promise<void> {
  await initializeOfflineStore();
  const db = await database();
  await db.runAsync("DELETE FROM offline_draft WHERE feature = ?", feature);
}

export async function enqueueOutbox<T>(item: { id: string; operation: SyncOperation; payload: T }): Promise<void> {
  await initializeOfflineStore();
  const now = Date.now();
  const db = await database();
  await db.runAsync(
    `INSERT INTO sync_outbox(id, operation, payload, status, retry_count, last_error, next_attempt_at, created_at, updated_at, synced_at)
     VALUES (?, ?, ?, 'PENDING', 0, NULL, NULL, ?, ?, NULL)
     ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, status = 'PENDING', retry_count = 0, last_error = NULL, next_attempt_at = NULL, updated_at = excluded.updated_at`,
    item.id,
    item.operation,
    JSON.stringify(item.payload),
    now,
    now,
  );
}

export async function getSyncableOutbox(includeDeferred = false): Promise<OutboxItem[]> {
  await initializeOfflineStore();
  const db = await database();
  const rows = await db.getAllAsync<{
    id: string;
    operation: SyncOperation;
    payload: string;
    status: SyncStatus;
    retry_count: number;
    last_error: string | null;
    next_attempt_at: number | null;
    created_at: number;
    updated_at: number;
    synced_at: number | null;
  }>(includeDeferred
    ? "SELECT * FROM sync_outbox WHERE status IN ('PENDING', 'FAILED') ORDER BY created_at ASC"
    : "SELECT * FROM sync_outbox WHERE status = 'PENDING' OR (status = 'FAILED' AND (next_attempt_at IS NULL OR next_attempt_at <= ?)) ORDER BY created_at ASC",
    ...(includeDeferred ? [] : [Date.now()]));

  return rows.flatMap((row) => {
    try {
      return [{
        id: row.id,
        operation: row.operation,
        payload: JSON.parse(row.payload),
        status: row.status,
        retryCount: row.retry_count,
        nextAttemptAt: row.next_attempt_at,
        lastError: row.last_error,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        syncedAt: row.synced_at,
      }];
    } catch {
      return [];
    }
  });
}

export async function claimOutboxItem(id: string, includeDeferred = false): Promise<boolean> {
  await initializeOfflineStore();
  const db = await database();
  const result = await db.runAsync(
    includeDeferred
      ? "UPDATE sync_outbox SET status = 'SYNCING', updated_at = ? WHERE id = ? AND status IN ('PENDING', 'FAILED')"
      : "UPDATE sync_outbox SET status = 'SYNCING', updated_at = ? WHERE id = ? AND (status = 'PENDING' OR (status = 'FAILED' AND (next_attempt_at IS NULL OR next_attempt_at <= ?)))",
    Date.now(),
    id,
    ...(includeDeferred ? [] : [Date.now()]),
  );
  return result.changes === 1;
}

export async function markOutboxSynced(id: string): Promise<void> {
  await initializeOfflineStore();
  const now = Date.now();
  const db = await database();
  await db.runAsync(
    "UPDATE sync_outbox SET status = 'SYNCED', last_error = NULL, next_attempt_at = NULL, updated_at = ?, synced_at = ? WHERE id = ?",
    now,
    now,
    id,
  );
}

export async function markOutboxFailed(id: string, error: string, retryCount: number): Promise<void> {
  await initializeOfflineStore();
  const db = await database();
  await db.runAsync(
    "UPDATE sync_outbox SET status = 'FAILED', retry_count = retry_count + 1, last_error = ?, next_attempt_at = ?, updated_at = ? WHERE id = ?",
    error.slice(0, 500),
    Date.now() + retryDelayMs(retryCount),
    Date.now(),
    id,
  );
}

export async function getNextOutboxRetryAt(): Promise<number | null> {
  await initializeOfflineStore();
  const db = await database();
  const [row] = await db.getAllAsync<{ next_attempt_at: number | null }>(
    "SELECT MIN(next_attempt_at) AS next_attempt_at FROM sync_outbox WHERE status = 'FAILED' AND next_attempt_at IS NOT NULL",
  );
  return row?.next_attempt_at ?? null;
}

export async function getOutboxSummary(): Promise<OutboxSummary> {
  await initializeOfflineStore();
  const db = await database();
  const rows = await db.getAllAsync<{ status: SyncStatus; count: number }>(
    "SELECT status, COUNT(*) AS count FROM sync_outbox GROUP BY status",
  );
  const summary: OutboxSummary = { PENDING: 0, SYNCING: 0, SYNCED: 0, FAILED: 0 };
  for (const row of rows) summary[row.status] = Number(row.count);
  return summary;
}

export async function purgeSyncedOutbox(maxAgeMs = 7 * 24 * 60 * 60 * 1000): Promise<void> {
  const db = await database();
  await db.runAsync(
    "DELETE FROM sync_outbox WHERE status = 'SYNCED' AND synced_at IS NOT NULL AND synced_at < ?",
    Date.now() - maxAgeMs,
  );
}
