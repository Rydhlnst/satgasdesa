# cPanel Node.js deployment

This project uses Next.js standalone output and runs as a regular Node.js process. It does not require an Edge Worker, Redis, or a platform-specific adapter.

## Build

Use Node.js 20 or newer, then run from the project root:

```bash
npm ci
npm run build:cpanel
```

The build script copies the public assets and Next static assets into `.next/standalone`, which is the self-contained runtime bundle.

## cPanel Node.js application

Configure the application with:

- Application root: the project root
- Startup file: `.next/standalone/server.js`
- Node.js: 20+
- Application mode: production
- Port: use the port assigned by cPanel through `PORT`

Set the production environment variables from `.env.example`, including `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL`. Keep `BETTER_AUTH_URL` on HTTPS in production.

The database remains online-first. The service worker only caches the app shell and static assets and falls back to `/offline`; it does not cache dashboard responses or synchronize transactions offline.
