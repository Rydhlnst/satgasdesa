import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer } from "@/components/app-shell/page-container";
import { EvidenceList } from "@/src/features/evidence/components/evidence-list";
import { EvidenceUploader } from "@/src/features/evidence/components/evidence-uploader";
import { MoneyDisplay } from "@/components/shared/money-display";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { getTransactionEvidence } from "@/src/features/evidence/service";
import { getFinancialTransaction } from "@/src/features/finance/service";
import { hasPermission, requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";
import { approveFinancialTransactionAction, reverseFinancialTransactionAction } from "../../_actions";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }> };

export default async function TransactionDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await requirePermission(PERMISSIONS.FINANCE_READ);
  const transaction = await getFinancialTransaction(id);
  if (!transaction) notFound();
  const [evidence, canApprove, canCreate] = await Promise.all([getTransactionEvidence(id), hasPermission(session.user.id, PERMISSIONS.FINANCE_APPROVE), hasPermission(session.user.id, PERMISSIONS.FINANCE_CREATE)]);
  return <PageContainer><div className="space-y-8"><PageHeader breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Finance", href: "/dashboard/finance" }, { label: transaction.transactionCode }]} description={transaction.description} eyebrow="Transaction detail" title={transaction.transactionCode} actions={<StatusBadge status={transaction.status} />} /><section className="grid gap-4 sm:grid-cols-3"><Info label="Type" value={transaction.transactionType.replace("CASH_", "Cash ")} /><Info label="Amount" value={<MoneyDisplay value={transaction.amount} />} /><Info label="Recorded" value={transaction.transactionAt.toLocaleString("en-GB")} /></section><div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]"><Card className="shadow-sm"><CardHeader><CardTitle className="font-heading text-xl uppercase tracking-wide">Evidence</CardTitle></CardHeader><CardContent className="space-y-5">{evidence.length ? <EvidenceList entityId={id} items={evidence} kind="transaction" /> : <p className="text-sm text-muted-foreground">No evidence attached.</p>}{canCreate && transaction.status === "DRAFT" ? <EvidenceUploader entityId={id} kind="transaction" /> : null}</CardContent></Card><div className="space-y-5">{canApprove && transaction.status === "DRAFT" ? <Card><CardHeader><CardTitle>Approve</CardTitle></CardHeader><CardContent><form action={approveFinancialTransactionAction}><input name="id" type="hidden" value={id} /><Button type="submit">Approve transaction</Button></form></CardContent></Card> : null}{canApprove && transaction.status === "SAH" ? <Card><CardHeader><CardTitle>Reverse</CardTitle></CardHeader><CardContent><form action={reverseFinancialTransactionAction} className="space-y-3"><input name="id" type="hidden" value={id} /><textarea className="min-h-24 w-full border border-input bg-transparent p-3 text-sm" name="reason" placeholder="Reversal reason" required /><Button type="submit" variant="destructive">Reverse transaction</Button></form></CardContent></Card> : null}</div></div></div></PageContainer>;
}

function Info({ label, value }: { label: string; value: React.ReactNode }) { return <Card className="shadow-sm"><CardContent className="p-5"><p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p><p className="mt-3 text-sm font-semibold">{value}</p></CardContent></Card>; }
