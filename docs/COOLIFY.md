# Coolify Deployment

## Recommended setup

Use this repository's `docker-compose.yml` as a Docker Compose resource in Coolify. Expose only the `app` service through the Coolify domain on internal port `3000`. The production Compose file uses `expose` instead of publishing a host port, so it will not conflict with another service already using port 3000. Keep the `mysql` service on the private Compose network and do not publish port 3306.

For Docker Desktop local access, use the local override so the app is available at `http://localhost:3000`:

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build
```

The app container automatically:

1. validates required environment variables;
2. waits for MySQL and applies Drizzle migrations;
3. optionally seeds roles and permissions when `SEED_RBAC=true`;
4. starts the Next.js standalone server.

## Required Coolify variables

Set these as encrypted environment variables:

```text
MYSQL_DATABASE=satgas
MYSQL_USER=satgas
MYSQL_PASSWORD=<strong-password>
MYSQL_ROOT_PASSWORD=<strong-root-password>
BETTER_AUTH_SECRET=<long-random-secret>
BETTER_AUTH_URL=https://your-domain.example
NODE_ENV=production
DB_CONNECTION_LIMIT=5
SEED_RBAC=false
BOOTSTRAP_ADMIN_NAME=<initial admin name>
BOOTSTRAP_ADMIN_EMAIL=<initial admin email>
BOOTSTRAP_ADMIN_PASSWORD=<temporary password, 12+ characters>
EMAIL_PROVIDER=resend
EMAIL_FROM=SATGAS DESA SEJOLI <noreply@your-domain.example>
RESEND_API_KEY=<secret>
STORAGE_PROVIDER=r2
STORAGE_BUCKET=<private-bucket>
STORAGE_ENDPOINT=<r2-s3-endpoint>
STORAGE_REGION=auto
STORAGE_ACCESS_KEY_ID=<secret>
STORAGE_SECRET_ACCESS_KEY=<secret>
ROAD_ENTRY_DUE_AUTOMATION_ENABLED=false
```

Set `SEED_RBAC=true` only on the first deployment or when reference roles/permissions need reconciliation. Set the three `BOOTSTRAP_ADMIN_*` variables only for the first deployment to create one verified Pimpinan account; the seed never changes an existing account password. Remove the bootstrap password from Coolify after the first successful deployment. Do not use demo credentials in production.

Use a URL-safe `MYSQL_PASSWORD` (letters, numbers, `_`, and `-`) or URL-encode reserved characters when constructing `DATABASE_URL` manually. The Compose file uses the password as a MySQL URL component.

## Health and operations

- Coolify health check: `GET /api/health`.
- The health endpoint checks MySQL connectivity and returns no internal error details.
- Use the Coolify domain over HTTPS; Better Auth cookies and the service worker depend on this.
- Schedule the daily job externally with `POST /api/jobs/daily` and `Authorization: Bearer <CRON_SECRET>` after setting `AUTOMATION_ACTOR_USER_ID` and `CRON_SECRET`.
- Back up the MySQL named volume and use the documented logical backup procedure in `docs/BACKUP-RESTORE.md`.
- Keep R2 private and use signed download URLs only.

## First deployment

1. Deploy the Compose resource.
2. Wait for `/api/health` to become healthy.
3. Confirm the migration log reports `Database migrations applied.`.
4. Create or invite the first internal user through the application.
5. Set `SEED_RBAC=false` after role/permission seed verification.
