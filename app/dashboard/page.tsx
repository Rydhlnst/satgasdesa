import type { AccessRole } from "@/components/app-shell/navigation";
import { PageContainer } from "@/components/app-shell/page-container";
import { getDashboardSummary, getNeedsAttention } from "@/src/features/dashboard/service";
import { getSession } from "@/src/lib/auth/session";
import { DesktopDashboard } from "./_components/desktop-dashboard";
import { MobileDashboard } from "./_components/mobile-dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const [summary, attention] = await Promise.all([getDashboardSummary(), getNeedsAttention()]);
  const budget = "missing" in summary.budget ? null : summary.budget;
  const accessRole: AccessRole = summary.roleScope.canManageUsers ? "PIMPINAN" : summary.roleScope.canReadFinance ? "BENDAHARA" : "PETUGAS_LAPANGAN";

  return <PageContainer>
    <div className="md:hidden">
      <MobileDashboard role={accessRole} attention={attention} budget={budget} dues={summary.dues} finance={summary.finance} operational={summary.operational} realization={summary.realization} userName={session.user.name} />
    </div>
    <div className="hidden md:block">
      <DesktopDashboard attention={attention} role={accessRole} summary={summary} userName={session.user.name} />
    </div>
  </PageContainer>;
}
