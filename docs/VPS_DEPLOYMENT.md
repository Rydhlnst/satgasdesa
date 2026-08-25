# VPS deployment

This setup runs Next.js, MySQL, Caddy, and persistent local media storage with Docker Compose.

## 1. VPS requirements

- Ubuntu/Debian VPS with Docker Engine and Compose plugin
- A domain pointing to the VPS public IP
- TCP ports 80 and 443 open

## 2. Deploy the server

```bash
git clone <repository-url> satgas-desa-sejoli
cd satgas-desa-sejoli
cp .env.example .env
```

Set at least these values in `.env`:

```env
APP_DOMAIN=app.example.com
BETTER_AUTH_URL=https://app.example.com
NODE_ENV=production
MYSQL_DATABASE=satgas
MYSQL_USER=satgas
MYSQL_PASSWORD=<strong-url-safe-password>
MYSQL_ROOT_PASSWORD=<strong-root-password>
BETTER_AUTH_SECRET=<random-secret-at-least-32-characters>
STORAGE_PROVIDER=filesystem
STORAGE_LOCAL_ROOT=public/uploads
SEED_RBAC=true
BOOTSTRAP_ADMIN_NAME=<first-admin-name>
BOOTSTRAP_ADMIN_EMAIL=<first-admin-email>
BOOTSTRAP_ADMIN_PASSWORD=<temporary-password>
```

Start the stack:

```bash
docker compose -f docker-compose.yml -f docker-compose.vps.yml up -d --build
docker compose -f docker-compose.yml -f docker-compose.vps.yml logs -f app
```

The app container waits for MySQL, applies migrations, and starts the server. Verify `https://app.example.com/api/health`. After the first successful boot, set `SEED_RBAC=false` and remove the bootstrap password from `.env`.

The `satgas_uploads` volume persists images across container rebuilds. Keep regular MySQL and Docker-volume backups.

## 3. Build a downloadable Android APK

Install and authenticate with EAS locally:

```bash
cd mobile
npx eas-cli login
npx eas-cli build:configure
npx eas-cli env:set --name EXPO_PUBLIC_API_URL --value https://app.example.com --environment preview --visibility plaintext
npx eas-cli env:set --name EXPO_PUBLIC_API_URL --value https://app.example.com --environment production --visibility plaintext
npx eas-cli build --platform android --profile preview
```

The `preview` profile creates an installable APK. EAS returns a download URL after the build completes. The `production` profile creates an Android App Bundle for Google Play:

```bash
npx eas-cli build --platform android --profile production
```

Do not use the LAN URL in the downloadable build; it must use the HTTPS VPS domain.
