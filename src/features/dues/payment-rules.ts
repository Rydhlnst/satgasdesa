export type DuePaymentStatus = "UNPAID" | "PARTIAL" | "PAID";

type DuePaymentState = { amountDue: number; amountPaid: number; status: string };
type UpdatedDuePaymentState = { amountPaid: number; status: DuePaymentStatus };
type PaymentIdentity = { dueId: string; amount: number; paymentDate: string; method: string };

export function hasMatchingPaymentIdentity(existing: PaymentIdentity, incoming: PaymentIdentity): boolean {
  return existing.dueId === incoming.dueId && existing.amount === incoming.amount && existing.paymentDate === incoming.paymentDate && existing.method === incoming.method;
}

export function applyDuePayment(current: DuePaymentState, amount: number): UpdatedDuePaymentState {
  if (current.status === "PAID") throw new Error("This due has already been fully paid.");
  if (amount > current.amountDue - current.amountPaid) throw new Error("Payment exceeds the outstanding balance.");
  const amountPaid = current.amountPaid + amount;
  return { amountPaid, status: amountPaid === current.amountDue ? "PAID" : "PARTIAL" };
}

export function reverseDuePayment(current: DuePaymentState, amount: number): UpdatedDuePaymentState {
  if (current.amountPaid < amount) throw new Error("Due payment balance is inconsistent and requires reconciliation.");
  const amountPaid = current.amountPaid - amount;
  return { amountPaid, status: amountPaid === 0 ? "UNPAID" : "PARTIAL" };
}
