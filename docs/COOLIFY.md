# Coolify Deployment

## Recommended setup

Use this repository's `docker-compose.yml` as a Docker Compose resource in Coolify. Expose only the `app` service through the Coolify domain on internal port `3000`. The production Compose file uses `expose` instead of publishing a host port, so it will not conflict with another service already using port 3000. Keep the `mysql` service on the private Compose network and do not publish port 3306.

The Compose services explicitly use `restart: "no"`. A crashed deployment stops immediately so the original container error remains available for diagnosis. Startup migration runs once; automatic migration retries are disabled.

For Docker Desktop local access, use the local override so the app is available at `http://localhost:3000`:

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build
```

The app container automatically:

1. starts after MySQL reports healthy;
2. validates required environment variables and applies Drizzle migrations;
3. optionally seeds roles and permissions when `SEED_RBAC=true`;
4. starts the Next.js standalone server.

## Safe rebuild and migration contract

Normal VPS rebuilds are safe when the persistent MySQL volume and the Compose project name remain unchanged:

```bash
docker compose -f docker-compose.yml -f docker-compose.vps.yml up -d --build
```

The app runs `scripts/container-start.mjs` on every new container start. It validates the environment, checks the migration files for destructive table/row operations, applies only pending Drizzle migrations, skips only duplicate table/index/constraint objects left by an interrupted migration, seeds reference RBAC data when enabled, and starts the server. Applied migrations are tracked by Drizzle, so a rebuild does not replay them. Any other schema error still stops startup for review.

Production uses `pnpm db:migrate`/the runtime migrator only. Do not use `pnpm db:push` against the VPS database. The migration safety check blocks `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, and `DELETE FROM` statements before the app starts. A blocked migration leaves the existing database untouched and the app container stopped for diagnosis.

Before a production rebuild, make a logical MySQL backup and verify that `MYSQL_DATA_VOLUME_NAME` is unchanged. A Docker volume is persistence, not a backup.

Never run `docker compose down -v`, remove `satgas_mysql_data_v2`, or change `MYSQL_DATA_VOLUME_NAME` during a normal deployment. Those actions can intentionally detach or delete the database volume.

For startup diagnosis, run `docker compose ps` and `docker compose logs --no-color app mysql`. Do not add a restart policy while investigating a failure.

## Required Coolify variables

Set these as encrypted environment variables:

```text
MYSQL_DATABASE=satgas
MYSQL_USER=satgas
MYSQL_PASSWORD=<strong-password>
MYSQL_ROOT_PASSWORD=<strong-root-password>
APP_REVISION=<GitHub commit SHA deployed by this release>
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
- The health endpoint checks MySQL connectivity and returns a safe deployment revision and request ID. Set `APP_REVISION` to the deployed GitHub commit SHA in Coolify; this makes stale deployments immediately visible in the app's Administration > Settings health panel and in API errors.
- API errors include `HTTP status`, stable error code, request ID, and server revision without exposing secrets or stack traces. For a 404, verify the mobile app is not newer than the backend and redeploy Coolify from the latest GitHub commit. For 500/503, inspect Coolify startup/migration and database logs.
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
