# Media storage on cPanel

Use the filesystem provider when the Next.js Node process runs on cPanel and has write access to the application directory.

```env
STORAGE_PROVIDER=cpanel
STORAGE_LOCAL_ROOT=public/uploads
BETTER_AUTH_SECRET=<same-long-secret-used-by-auth>
```

Create `public/uploads` and grant the Node application write permission. The app issues short-lived signed upload/download URLs, so the mobile app never receives filesystem credentials. Photos are resized to a maximum 1600px edge and compressed to JPEG before upload.

For a separate cPanel/PHP upload service, keep the same storage key layout (`blocks/<id>`, `excavators/<id>`, and `daily-information/<id>`) and replace the `FileSystemObjectStorage` adapter in `src/lib/storage/index.ts` with that service's signed upload implementation.
