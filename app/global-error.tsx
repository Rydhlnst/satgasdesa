"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return <html lang="id"><body><main><h1>Terjadi kesalahan</h1><p>Layanan belum dapat dimuat. Coba lagi beberapa saat lagi.</p><button onClick={reset} type="button">Coba lagi</button></main></body></html>;
}
