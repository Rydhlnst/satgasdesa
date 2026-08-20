# MySQL and Object Storage Backup/Restore

## MySQL backup

Run backups from a secured host with credentials supplied through the process environment. Do not place credentials in shell history or logs.

```bash
mysqldump --single-transaction --routines --events --triggers --hex-blob "$DATABASE_NAME" > satgas-$(date +%F).sql
gzip satgas-$(date +%F).sql
sha256sum satgas-$(date +%F).sql.gz > satgas-$(date +%F).sha256
```

Use daily backups, retain at least 30 daily copies and 12 monthly copies, and copy encrypted archives to a separate host or provider. Restrict backup access to operators who need restore access.

## Restore test

Restore into a non-production MySQL database, never over the live database:

```bash
sha256sum -c satgas-YYYY-MM-DD.sha256
gunzip -c satgas-YYYY-MM-DD.sql.gz | mysql "$RESTORE_DATABASE_NAME"
pnpm db:migrate
```

Verify login, an audit record, due/payment reconciliation, cash balance, report totals, and an evidence download. Record the test date, database version, backup checksum, and result.

## Object storage

Use private buckets with versioning where available. Apply lifecycle rules for abandoned multipart uploads and retain evidence according to the project retention policy. Database metadata is authoritative for authorization; files must only be downloaded through an authorized signed URL. Define a periodic orphan scan for storage keys with no matching evidence row before deleting anything.
