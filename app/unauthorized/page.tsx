import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Akses terbatas</p>
        <h1 className="mt-3 font-heading text-2xl font-semibold">Akses tidak tersedia</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Akun Anda tidak memiliki izin untuk membuka area ini.
        </p>
        <Button asChild className="mt-6">
          <Link href="/dashboard">Kembali ke dashboard</Link>
        </Button>
      </div>
    </main>
  );
}
