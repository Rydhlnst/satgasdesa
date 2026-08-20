import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer } from "@/components/app-shell/page-container";
import { MoneyDisplay } from "@/components/shared/money-display";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { getDue } from "@/src/features/dues/service";
import { PAYMENT_METHODS } from "@/src/features/dues/config";
import { hasPermission, requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";
import { recordDuePaymentAction } from "../_actions";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }> };

export default async function DueDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await requirePermission(PERMISSIONS.DUES_READ);
  const result = await getDue(id);
  if (!result) notFound();
  const canPay = await hasPermission(session.user.id, PERMISSIONS.PAYMENT_CREATE);
  return <PageContainer><div className="space-y-8"><PageHeader breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Dues", href: "/dashboard/dues" }, { label: result.item.payerName }]} description={`${result.item.dueType.replaceAll("_", " ")} · ${result.item.referenceKey}`} eyebrow="Due detail" title={result.item.payerName} actions={<StatusBadge status={result.item.status} />} /><section className="grid gap-4 sm:grid-cols-3"><Info label="Amount due" value={<MoneyDisplay value={result.item.amountDue} />} /><Info label="Paid" value={<MoneyDisplay value={result.item.amountPaid} />} /><Info label="Remaining" value={<MoneyDisplay value={result.item.remaining} />} /></section><div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]"><Card className="shadow-sm"><CardHeader><CardTitle className="font-heading text-xl uppercase tracking-wide">Payment history</CardTitle></CardHeader><CardContent>{result.payments.length ? <div className="divide-y divide-border">{result.payments.map((payment) => <article className="py-4 first:pt-0 last:pb-0" key={payment.id}><div className="flex flex-wrap justify-between gap-3"><div><p className="font-semibold"><MoneyDisplay value={payment.amount} /></p><p className="mt-1 text-xs text-muted-foreground">{payment.paymentDate} · {payment.method}</p></div><p className="text-xs text-muted-foreground">{payment.payerName}</p></div>{payment.notes ? <p className="mt-2 text-sm text-muted-foreground">{payment.notes}</p> : null}</article>)}</div> : <p className="text-sm text-muted-foreground">No payments recorded.</p>}</CardContent></Card>{canPay && result.item.remaining > 0 ? <Card className="shadow-sm"><CardHeader><CardTitle className="font-heading text-xl uppercase tracking-wide">Record payment</CardTitle></CardHeader><CardContent><form action={recordDuePaymentAction} className="space-y-3"><input name="dueId" type="hidden" value={result.item.id} /><input name="idempotencyKey" type="hidden" value={crypto.randomUUID()} /><input className="h-10 w-full border-b border-input bg-transparent text-sm" defaultValue={result.item.payerName} name="payerName" placeholder="Payer name" required /><input className="h-10 w-full border-b border-input bg-transparent text-sm" name="paymentDate" type="date" required /><input className="h-10 w-full border-b border-input bg-transparent text-sm" max={result.item.remaining} name="amount" placeholder="Amount" type="number" required /><select className="h-10 w-full border-b border-input bg-transparent text-sm" name="method">{PAYMENT_METHODS.map((method) => <option key={method}>{method.replaceAll("_", " ")}</option>)}</select><input className="h-10 w-full border-b border-input bg-transparent text-sm" name="evidenceKey" placeholder="Evidence key (optional)" /><textarea className="min-h-24 w-full border border-input bg-transparent p-3 text-sm" name="notes" placeholder="Notes" /><Button type="submit">Record payment</Button></form></CardContent></Card> : null}</div></div></PageContainer>;
}

function Info({ label, value }: { label: string; value: React.ReactNode }) { return <Card className="shadow-sm"><CardContent className="p-5"><p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p><p className="mt-3 text-sm font-semibold">{value}</p></CardContent></Card>; }
