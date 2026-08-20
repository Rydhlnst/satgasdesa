import { AlertCircle, Banknote, Blocks, ClipboardCheck, FileWarning, HardHat, WalletCards } from "lucide-react";

import { PageContainer } from "@/components/app-shell/page-container";
import { EmptyState } from "@/components/shared/empty-state";
import { MetricCard } from "@/components/shared/metric-card";
import { MoneyDisplay } from "@/components/shared/money-display";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getDashboardSummary, getNeedsAttention } from "@/src/features/dashboard/service";
import { getSession } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function DashboardSection({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{eyebrow}</p>
        <h2 className="mt-2 font-heading text-xl font-semibold uppercase tracking-wide">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    return null;
  }

  const [summary, attention] = await Promise.all([getDashboardSummary(), getNeedsAttention()]);
  const operational = summary.operational;
  const totalExcavators = operational
    ? Object.values(operational.excavators).reduce((total, value) => total + Number(value), 0)
    : 0;
  const activeExcavators = operational ? Number(operational.excavators.ACTIVE ?? 0) : 0;
  const budget = "missing" in summary.budget ? null : summary.budget;
  const budgetAvailable = summary.roleScope.canReadBudget && budget !== null;
  const hasAnyMetrics = Boolean(operational || summary.finance || summary.dues || budgetAvailable || summary.roleScope.canReadRealizations);

  return (
    <PageContainer>
      <div className="space-y-8">
        <PageHeader
          description={`Informasi operasional dan keuangan berbasis data untuk ${session.user.name}.`}
          eyebrow="Ringkasan"
          title="Dashboard"
        />

        {operational ? (
          <DashboardSection eyebrow="Operasional lapangan" title="Ringkasan lapangan">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                description={`${formatCount(operational.blocks.active)} active · ${formatCount(operational.blocks.stopped)} stopped`}
                icon={Blocks}
                label="Blok terdaftar"
                value={`${formatCount(operational.blocks.total)}`}
              />
              <MetricCard
                description={`${formatCount(activeExcavators)} active of ${formatCount(totalExcavators)} registered units`}
                icon={HardHat}
                label="Excavator"
                value={formatCount(totalExcavators)}
              />
              <MetricCard
                description="Recorded field inspections"
                icon={ClipboardCheck}
                label="Inspeksi"
                value={formatCount(operational.inspections)}
              />
              <MetricCard
                description="New, received, or in progress"
                icon={FileWarning}
                label="Informasi terbuka"
                value={formatCount(operational.dailyInformation.open)}
              />
            </div>
          </DashboardSection>
        ) : null}

        {summary.roleScope.canReadFinance && summary.finance ? (
          <DashboardSection eyebrow="Keuangan" title="Posisi kas">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard description={`${formatCount(summary.finance.transactionCount)} recorded transactions`} icon={WalletCards} label="Cash balance" value={<MoneyDisplay value={summary.finance.cashBalance} />} />
              <MetricCard description={`${formatCount(summary.finance.approvedCount)} approved transactions`} icon={Banknote} label="Cash in" value={<MoneyDisplay value={summary.finance.cashIn} />} />
              <MetricCard description={`${formatCount(summary.finance.draftCount)} awaiting approval`} icon={Banknote} label="Cash out" value={<MoneyDisplay value={summary.finance.cashOut} />} />
              <MetricCard
                description={summary.finance.reconciliation.reconciled ? "Ledger totals are aligned" : "Review reconciliation differences"}
                icon={summary.finance.reconciliation.reconciled ? ClipboardCheck : AlertCircle}
                label="Reconciliation"
                value={summary.finance.reconciliation.reconciled ? "Aligned" : "Review"}
              />
            </div>
          </DashboardSection>
        ) : null}

        {summary.roleScope.canReadDues && summary.dues ? (
          <DashboardSection eyebrow="Iuran" title="Piutang">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard description={`${formatCount(summary.dues.counts.total)} total obligations`} icon={Banknote} label="Receivables" value={<MoneyDisplay value={summary.dues.receivableTotal} />} />
              <MetricCard description={`${formatCount(summary.dues.counts.unpaid)} unpaid records`} label="Unpaid" value={formatCount(summary.dues.counts.unpaid)} />
              <MetricCard description={`${formatCount(summary.dues.counts.partial)} partially paid records`} label="Partial" value={formatCount(summary.dues.counts.partial)} />
              <MetricCard description={summary.dues.reconciled ? "Recorded payments match the ledger" : "Review recorded payment totals"} label="Reconciliation" value={summary.dues.reconciled ? "Aligned" : "Review"} />
            </div>
          </DashboardSection>
        ) : null}

        {summary.roleScope.canReadBudget ? (
          <DashboardSection eyebrow="Anggaran" title={`Periode berjalan · ${summary.budget.periodKey}`}>
            {budgetAvailable && budget ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard description="Available funds after income and opening balance" label="Available funds" value={<MoneyDisplay value={budget.availableFunds} />} />
                <MetricCard description="Total approved allocation" label="Allocation" value={<MoneyDisplay value={budget.totalAllocation} />} />
                <MetricCard description="Approved realization amount" label="Approved realization" value={<MoneyDisplay value={budget.approvedRealization} />} />
                <Card className="shadow-sm">
                  <CardHeader className="pb-3"><CardTitle className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Absorption</CardTitle></CardHeader>
                  <CardContent>
                    <p className="font-heading text-2xl font-semibold tracking-wide">{budget.absorptionPercentage}%</p>
                    <Progress aria-label="Budget absorption" className="mt-4" value={Math.min(100, Math.max(0, budget.absorptionPercentage))} />
                  </CardContent>
                </Card>
              </div>
            ) : <EmptyState description="Create the current budget period to make allocation metrics available." title="No budget period" />}
          </DashboardSection>
        ) : null}

        {summary.roleScope.canReadRealizations ? (
          <DashboardSection eyebrow="Realisasi" title="Alur pengajuan">
            {Object.keys(summary.realization).length ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Object.entries(summary.realization).map(([status, total]) => <MetricCard key={status} label={status.replaceAll("_", " ")} value={formatCount(total)} />)}
              </div>
            ) : <EmptyState description="No realization requests have been recorded for the current data set." title="No realization activity" />}
          </DashboardSection>
        ) : null}

        <section className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.65fr)]">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="font-heading text-xl uppercase tracking-wide">Needs attention</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {attention.length ? (
                <div className="divide-y divide-border">
                  {attention.map((item) => (
                    <article className="flex gap-4 px-6 py-5" key={`${item.entityType}-${item.entityId}-${item.type}`}>
                      <AlertCircle aria-hidden="true" className={item.severity === "HIGH" ? "mt-0.5 size-4 shrink-0 text-destructive" : "mt-0.5 size-4 shrink-0 text-muted-foreground"} />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{item.title}</p><StatusBadge status={item.severity} /></div>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.detail}</p>
                      </div>
                    </article>
                  ))}
                </div>
              ) : <EmptyState description="There are no unresolved items requiring attention." title="All clear" />}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader><CardTitle className="font-heading text-xl uppercase tracking-wide">Account</CardTitle></CardHeader>
            <CardContent>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Signed in as</p>
              <p className="mt-3 font-heading text-2xl font-semibold">{session.user.name}</p>
              <p className="mt-1 break-words text-sm text-muted-foreground">{session.user.email}</p>
              {!hasAnyMetrics ? <p className="mt-6 border-t border-border pt-5 text-sm leading-relaxed text-muted-foreground">Your account is active, but no dashboard modules are available for your current permissions.</p> : null}
            </CardContent>
          </Card>
        </section>
      </div>
    </PageContainer>
  );
}
