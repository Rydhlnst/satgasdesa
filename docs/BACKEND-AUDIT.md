# Backend Audit — 2026-08-20

## Architecture

- Single-project Next.js App Router modular monolith.
- Server Actions for internal mutations; Route Handlers for Better Auth, exports, and daily cron.
- Drizzle ORM with `drizzle-orm/mysql2` and `mysql2`.
- Better Auth with email/password, verification, password reset, disabled public signup, and inactive-user session blocking.
- Domain services under `src/features/*`, centralized permissions, audit logging, email, storage, and database access.
- No Express, Hono, Prisma, PostgreSQL, Redis, queues, or separate API server.

## Database

- 32 MySQL tables are declared under `src/db/schema`.
- Migrations `0000` through `0013` exist under `drizzle/`.
- IDs use UUID strings; timestamps use MySQL timestamps; money uses MySQL `BIGINT` read as JavaScript numbers.
- Important financial/history foreign keys use `RESTRICT`; operational child records use `CASCADE` or `SET NULL` where appropriate.
- Unique constraints protect user email, roles, permissions, excavator unit codes, budget periods, dues references, transaction codes, and notification dispatches.
- Evidence metadata migration `0011_illegal_hulk.sql`, integrity constraints migration `0012_aberrant_pestilence.sql`, and query-index migration `0013_young_grandmaster.sql` are ready for MySQL deployment.

## Existing protections

- Server-side permission checks are present on reviewed mutations.
- Zod validation exists for reviewed feature inputs, workflow transitions, money, GPS, and uploads.
- Payments and final realization approval use transactions, optimistic state updates, and idempotency/source checks.
- `SAH` financial transactions are reversed rather than edited or deleted.
- Audit writes are included in critical mutations.
- Pagination exists for the newer list APIs and is capped at 100 rows.

## Findings by priority

### P0

- None found in the reviewed implementation.

### P1

- Backup restore verification and full end-to-end role/workflow tests still require a deployment-grade test database and test accounts.

### P2

- Legacy compatibility functions such as `getFinancialTransactions`, `getDues`, `getInspections`, `getExcavators`, `getDailyInformation`, and `getBlocks` are now hard-capped at 100 rows. New callers should use paginated variants for complete datasets.
- Finance summary and cash-balance calculations now use SQL aggregation instead of loading transaction/payment/realization rows into Node.js.
- Monthly report and monthly due generation load period rows or full movement/unit sets into Node.js. This is acceptable for the initial scale but should be replaced with grouped SQL queries if tables grow materially.
- Daily automation notification scans are bounded to 500 records per run. If the dataset grows beyond that, add cursor batching.
- Important queries have been checked with MySQL `EXPLAIN`; repeat the check after production data volume grows.

### P3

- Several small master-table indexes (`block.code`, `block.status`, `excavator.status`) may be unnecessary at current volume; retain until production query plans confirm removal.
- Audit indexes currently cover actor, entity, and created time, but not the combined `(actor_user_id, created_at)` access pattern requested by the audit page.

## Potential N+1 and duplicate queries

- No obvious loop-driven N+1 query was found in the reviewed services. Block details use a fixed set of parallel child queries.
- `getNeedsAttention` intentionally issues separate bounded queries by permission; it should remain bounded and should not be called repeatedly from nested components.
- Notification dispatch performs one small insert transaction per active recipient. This is acceptable for approximately 100 users but should be batch-oriented if volume increases.

## Financial safety review

- Receivables are calculated separately from cash transactions.
- Payment creation updates the due, payment row, cash-in transaction, and audits in one transaction.
- Realization approval uses a conditional status update and checks for an existing cash-out before inserting one.
- Reversal uses a conditional `SAH` to `REVERSED` update, preventing concurrent duplicate reversals.
- Money is validated as positive integer Rupiah and capped at `Number.MAX_SAFE_INTEGER`; the database still stores `BIGINT` through Drizzle's number mode, so a future larger-money requirement would need a centralized `bigint` strategy.

## Recommended order

1. Keep the explicit five-connection pool and bounded compatibility reads in place.
2. Run `pnpm qa:mysql` and `pnpm db:explain` against the deployment database.
3. Replace report/monthly-due in-memory aggregation with SQL aggregates or bounded batches when data volume warrants it.
4. Execute the QA checklist and backup restore test.
