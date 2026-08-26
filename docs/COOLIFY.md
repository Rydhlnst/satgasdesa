# Coolify Deployment

## Recommended setup

Use this repository's `docker-compose.yml` as a Docker Compose resource in Coolify. Expose only the `app` service through the Coolify domain on internal port `3000`. The production Compose file uses `expose` instead of publishing a host port, so it will not conflict with another service already using port 3000. Keep the `mysql` service on the private Compose network and do not publish port 3306.

The Compose services use `restart: on-failure:5`. A crashed deployment is retried at most five times and then stays stopped for diagnosis; it does not enter an endless restart loop. Database migration readiness also has a finite 30-attempt limit.

For Docker Desktop local access, use the local override so the app is available at `http://localhost:3000`:

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build
```

The app container automatically:

1. waits for MySQL;
2. validates required environment variables and applies Drizzle migrations;
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
PUSH_NOTIFICATIONS_ENABLED=false
SENTRY_DSN=<server-dsn>
NEXT_PUBLIC_SENTRY_DSN=<browser-dsn>
SENTRY_TRACES_SAMPLE_RATE=0.1
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_ORG=<organization-slug>
SENTRY_PROJECT=<project-slug>
SENTRY_AUTH_TOKEN=<source-map-upload-token>
ROAD_ENTRY_DUE_AUTOMATION_ENABLED=false
DAILY_AUTOMATION_ENABLED=false
AUTOMATION_ACTOR_USER_ID=<active-pimpinan-user-uuid>
CRON_SECRET=<long-random-secret>
```

Set `SEED_RBAC=true` only on the first deployment or when reference roles/permissions need reconciliation. Set the three `BOOTSTRAP_ADMIN_*` variables only for the first deployment to create one verified Pimpinan account; the seed never changes an existing account password. Remove the bootstrap password from Coolify after the first successful deployment. Do not use demo credentials in production.

Use a URL-safe `MYSQL_PASSWORD` (letters, numbers, `_`, and `-`) or URL-encode reserved characters when constructing `DATABASE_URL` manually. The Compose file uses the password as a MySQL URL component.

## Intentional application-database reset

To intentionally start with an empty application database without deleting the previous one, set a new unique `MYSQL_DATA_VOLUME_NAME` in Coolify, then redeploy. For example:

```text
MYSQL_DATA_VOLUME_NAME=satgasdesa_mysql_data_v3
```

The old volume remains on the server for recovery, but the deployment uses a new empty MySQL database. MySQL creates the requested user from `MYSQL_USER` and `MYSQL_PASSWORD`, then the app applies all Drizzle migrations on redeploy. Do not change this value during normal deployments.

Do not use `docker compose down -v` or remove the MySQL volume unless a full, irreversible database-server reset is explicitly required.

## Health and operations

- Coolify health check: `GET /api/health`.
- The health endpoint checks MySQL connectivity and returns no internal error details.
- Use the Coolify domain over HTTPS; Better Auth cookies and the service worker depend on this.
- Set `DAILY_AUTOMATION_ENABLED=true`, then schedule `POST /api/jobs/daily` once daily with `Authorization: Bearer <CRON_SECRET>` after setting `AUTOMATION_ACTOR_USER_ID` and `CRON_SECRET`. Set `MONTHLY_DUE_DAY=10` so the monthly collection window closes on the 10th. Confirm `/api/health` reports `automation.enabled` and `automation.configured` as `true` before enabling the scheduler.
- Back up the MySQL named volume and use the documented logical backup procedure in `docs/BACKUP-RESTORE.md`.
- Keep R2 private and use signed download URLs only.
- Configure Expo FCM/APNs credentials and an EAS development/production build before enabling `PUSH_NOTIFICATIONS_ENABLED`; Expo Go cannot receive remote notifications on SDK 53+.
- Run `PRODUCTION_URL=https://your-domain.example pnpm qa:production` after deployment. It verifies HTTPS, HSTS, and the database-backed health endpoint.

## First deployment

1. Deploy the Compose resource.
2. Wait for `/api/health` to become healthy.
3. Confirm the migration log reports `Database migrations applied.`.
4. Create or invite the first internal user through the application.
5. Set `SEED_RBAC=false` after role/permission seed verification.
