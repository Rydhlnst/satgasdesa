import type { Role } from "./theme";

export type SessionUser = { id: string; name: string; email: string };
export type Profile = { id: string; name: string; email: string; phone: string | null; image: string | null; status: string };
export type NotificationItem = { id: string; type: string; title: string; body: string; relatedEntityType: string | null; relatedEntityId: string | null; readAt: string | null; createdAt: string };
export type Session = { user: SessionUser; permissions: string[]; role: Role | null };
export type AttentionItem = { type: string; severity: "HIGH" | "MEDIUM"; entityId: string; entityType: string; title: string; detail: string; href?: string };
export type DashboardResponse = {
  summary: {
    periodKey: string;
    operational: { blocks: { total: number; active: number; stopped: number; notOperating: number }; excavators: Record<string, number>; inspections: number; workers: number; dailyInformation: { byStatus: Record<string, number>; open: number }; tasks: { TODO: number; IN_PROGRESS: number; DONE: number; CANCELLED: number; dueToday: number; items: Array<{ id: string; title: string; status: string; priority: string; dueDate: string | null }> } } | null;
    finance: { openingBalance: number; cashBalance: number; cashIn: number; cashOut: number; transactionCount: number; incomeExpenseSeries: Array<{ label: string; income: number; expense: number }> } | null;
    dues: { obligationTotal: number; recordedPaidTotal: number; receivableTotal: number; counts: { unpaid: number; partial: number; paid: number } } | null;
    budget: ({ periodKey: string; status: string; totalAllocation: number; availableFunds: number; unallocatedFunds: number; approvedRealization: number; pendingRealization: number; remainingAllocation: number; absorptionPercentage: number; overAllocatedRealizations: number } | { periodKey: string; missing: true }) & { categories: Array<{ id: string; name: string; allocatedAmount: number; realizedAmount: number; remainingAmount: number; absorptionPercentage: number }> };
    realization: Record<string, number>;
    requests: Record<string, number>;
    charts: { dues: { receivedAmount: number; outstandingAmount: number; paidPercentage: number } | null; finance: { incomeExpenseSeries: Array<{ label: string; income: number; expense: number }> } | null; budget: { categories: Array<{ id: string; name: string; allocatedAmount: number; realizedAmount: number; remainingAmount: number; absorptionPercentage: number }> } };
  };
  attention: AttentionItem[];
};
export type Block = { id: string; code: string; name: string; status: string; latitude: string; longitude: string; workerCount: number; operationalCondition: string; managerName: string | null; locationPicName: string | null; fieldPicName: string | null; priority?: string; areaHectares?: string | null; archivedAt?: string | null };
export type FieldAssignmentItem = { assignment: Record<string, unknown>; block: Record<string, unknown>; officer: Record<string, unknown> };
export type BlockWorkerAssignment = { assignment: Record<string, unknown>; worker: Record<string, unknown> };
export type BlockDetails = { item: Block; excavators: Array<Record<string, unknown>>; inspections: Array<Record<string, unknown>>; dailyInformation: Array<Record<string, unknown>>; managers: Array<Record<string, unknown>>; photos: Array<Record<string, unknown>>; workers: BlockWorkerAssignment[]; tasks: Array<Record<string, unknown>>; history: Array<Record<string, unknown>> };
