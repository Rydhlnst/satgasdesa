# Backend QA Checklist

Run against a disposable MySQL integration database with real migrations applied. Use test users for each role and an active and inactive account.

Container smoke commands:

```bash
docker compose up -d --build
docker compose exec app node scripts/qa/mysql-smoke.mjs
docker compose exec app node scripts/explain-queries.mjs
```

If the app image cannot be built because Docker Hub is unavailable, start only the cached MySQL image with `docker-compose.test.yml`, then run the migration and smoke scripts from the project directory using `DATABASE_URL` pointed at `127.0.0.1:3307`.

The smoke test is read-only and verifies MySQL connectivity, migrated core tables, and active CHECK constraints.

## Authorization and security

- Petugas cannot approve budgets/realizations or mutate cash.
- Inactive users receive an authorization failure from protected services.
- Evidence downloads fail when the actor lacks access or the key is outside its entity scope.
- Report reads require `REPORT_READ`; exports require `REPORT_EXPORT`.
- Validation errors are safe client errors; database errors and stack traces are not returned.

## Financial invariants

- Duplicate payment idempotency key creates one payment and one cash-in.
- Partial payments reconcile obligation, paid amount, and receivable.
- Duplicate realization approval creates one cash-out.
- Over-allocation approval is blocked for unauthorized roles.
- `SAH` records cannot be edited or deleted directly.
- Correction reverses the original cash-out and creates one replacement transaction atomically.
- Reversal and correction history remains visible in audit and approval timelines.

## Operational invariants

- Inspection upload rejects invalid GPS and more than three photos server-side.
- Financial and realization evidence accepts only approved image/PDF types and the configured size limit.
- High/urgent information, overdue dues, approval queues, and unresolved information dispatch idempotent notifications.
- Dashboard and monthly report totals reconcile to dues, payments, budgets, realizations, and financial transactions.

Record the MySQL version, migration revision, test date, and pass/fail result for each run.
