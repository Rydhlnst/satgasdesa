# Cloudflare R2 object storage

The application uses private Cloudflare R2 storage through the S3-compatible API and short-lived presigned URLs. Credentials stay server-side; browsers receive only an upload or download URL for one object.

## Environment

Copy the R2 values into the local `.env` file:

```env
STORAGE_PROVIDER=r2
STORAGE_BUCKET=satgas-desa-sejoli
STORAGE_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
STORAGE_REGION=auto
STORAGE_ACCESS_KEY_ID=<R2_ACCESS_KEY_ID>
STORAGE_SECRET_ACCESS_KEY=<R2_SECRET_ACCESS_KEY>
```

Create an R2 API token with object read/write access scoped to this bucket. Never commit the secret key.

## Bucket CORS

Because inspection photos upload from the browser to a presigned URL, add this policy to the bucket. Replace the origins with the real application origins and keep `localhost` only for local development.

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://satgas.beres.io",
      "https://satgasimage.beres.io"
    ],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

The application does not make the bucket public. Inspection photos remain private and are opened through short-lived download URLs. `https://satgas.beres.io` remains the app/API origin; `https://satgasimage.beres.io` is the trusted media origin.

Apply the policy with deployment credentials by running `pnpm storage:configure-cors` in the app container. The command writes the policy and reads it back; it fails if the required origins, methods, or `Content-Type` header are absent.

Before every production release, run `pnpm storage:verify-cors`. Set `STORAGE_CORS_ORIGINS` to a comma-separated list when additional trusted origins are required. This is required to resolve the browser preflight failure recorded in the production QA report.

## Image optimization

Inspection images are resized in the browser to a maximum 1600px edge and encoded as WebP where supported, with JPEG fallback. The client targets approximately 2.5 MB or less per image; the server still enforces the existing 10 MB upload limit and validates MIME type and extension.
