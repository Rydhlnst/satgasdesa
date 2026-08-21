"use client";

import { PageContainer } from "@/components/app-shell/page-container";
import { FormErrorToast } from "@/components/shared/action-form";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";

type DashboardErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  return (
    <PageContainer>
      <FormErrorToast error={error} />
      <div className="mx-auto max-w-xl"><ErrorState description="Data dashboard tidak dapat dimuat. Coba lagi atau kembali beberapa saat lagi." title="Dashboard tidak tersedia" /><div className="text-center"><Button className="mt-6" onClick={reset} variant="outline">Coba lagi</Button></div></div>
    </PageContainer>
  );
}
