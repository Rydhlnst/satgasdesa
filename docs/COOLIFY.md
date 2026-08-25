# Coolify Deployment

## Recommended setup

Use this repository's `docker-compose.yml` as a Docker Compose resource in Coolify. Expose only the `app` service through the Coolify domain on internal port `3000`. The production Compose file uses `expose` instead of publishing a host port, so it will not conflict with another service already using port 3000. Keep the `mysql` service on the private Compose network and do not publish port 3306.

For Docker Desktop local access, use the local override so the app is available at `http://localhost:3000`:

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build
```

The Compose deployment automatically:

1. waits for MySQL;
2. reconciles the `MYSQL_USER` account with `MYSQL_PASSWORD` inside the MySQL container;
3. validates required environment variables and applies Drizzle migrations;
4. optionally seeds roles and permissions when `SEED_RBAC=true`;
5. starts the Next.js standalone server.

MySQL is not reported healthy until account reconciliation finishes. This prevents the app migrations from starting with a stale application password.

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

This reset is destructive: it removes all application tables and data in `MYSQL_DATABASE`, including users and migration history. It retains the named MySQL volume and MySQL system accounts. It never runs as part of a normal deployment.

1. Confirm that losing all application data is intended.
2. Find the running MySQL container and stop the app service so it cannot write during the reset:

```bash
PROJECT_ID=<coolify-application-uuid>
MYSQL=$(sudo docker ps -q \
  --filter "label=com.docker.compose.project=$PROJECT_ID" \
  --filter "label=com.docker.compose.service=mysql" | head -n 1)
sudo docker stop $(sudo docker ps -q \
  --filter "label=com.docker.compose.project=$PROJECT_ID" \
  --filter "label=com.docker.compose.service=app")
```

3. Run the destructive reset once. This command uses the local MySQL root account and does not print its password:

```bash
sudo docker exec -it "$MYSQL" sh -lc \
  'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql --protocol=socket --socket=/var/run/mysqld/mysqld.sock -uroot -e "DROP DATABASE IF EXISTS \`$MYSQL_DATABASE\`; CREATE DATABASE \`$MYSQL_DATABASE\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"'
```

4. Redeploy. MySQL reconciles the app account and the app applies all Drizzle migrations to the empty database.

Do not use `docker compose down -v` or remove the MySQL volume unless a full, irreversible database-server reset is explicitly required.

## Health and operations

- Coolify health check: `GET /api/health`.
- The health endpoint checks MySQL connectivity and returns no internal error details.
- Use the Coolify domain over HTTPS; Better Auth cookies and the service worker depend on this.
- Set `DAILY_AUTOMATION_ENABLED=true`, then schedule `POST /api/jobs/daily` once daily with `Authorization: Bearer <CRON_SECRET>` after setting `AUTOMATION_ACTOR_USER_ID` and `CRON_SECRET`. Set `MONTHLY_DUE_DAY=7` so the monthly collection window closes on the 7th. Confirm `/api/health` reports `automation.enabled` and `automation.configured` as `true` before enabling the scheduler.
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
