"use client";

import { PageContainer } from "@/components/app-shell/page-container";
import { FormErrorToast } from "@/components/shared/action-form";
import { ErrorState } from "@/components/shared/ui-state";
import { Button } from "@/components/ui/button";

type DashboardErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  return (
    <PageContainer>
      <FormErrorToast error={error} />
      <ErrorState description="Data dashboard belum dapat dimuat. Coba lagi atau kembali beberapa saat lagi." primaryAction={<Button className="min-h-11" onClick={reset} variant="outline">Coba lagi</Button>} title="Dashboard tidak tersedia" variant="page" />
    </PageContainer>
  );
}
