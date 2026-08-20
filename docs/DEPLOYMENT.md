# Production Deployment

1. Configure `.env` from `.env.example` and run `pnpm env:check`.
2. Apply reviewed MySQL migrations with `pnpm db:migrate`.
3. Build and start the Node.js server with `pnpm build` and `pnpm start`.
4. Put the app behind HTTPS and a reverse proxy. The service worker and secure auth cookies require HTTPS outside localhost.
5. Configure private R2-compatible storage if `STORAGE_PROVIDER=r2`.
6. Configure Resend if `EMAIL_PROVIDER=resend`.
7. Schedule `POST /api/jobs/daily` with `Authorization: Bearer $CRON_SECRET` only when automation is enabled.

Required runtime controls:

- MySQL backups and restore tests: see `docs/BACKUP-RESTORE.md`.
- No production secrets in Git, client bundles, logs, or export filenames.
- Monitor migration failures, job failures, storage errors, and authentication errors without exposing stack traces to clients.
- Keep a VPS migration path by preserving the Node.js start command and externalizing MySQL/object-storage configuration.
