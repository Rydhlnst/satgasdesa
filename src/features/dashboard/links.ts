import type { AttentionItem } from "./service";

export function dashboardAttentionHref(item: AttentionItem): string | null {
  switch (item.entityType) {
    case "DUE": return `/dashboard/dues/${item.entityId}`;
    case "DAILY_INFORMATION": return `/dashboard/information/${item.entityId}`;
    case "REALIZATION": return `/dashboard/realizations/${item.entityId}`;
    case "FUND_REQUEST": return `/dashboard/fund-requests/${item.entityId}`;
    case "BUDGET_PERIOD": return "/dashboard/budgets";
    case "FIELD_TASK": return "/dashboard/blocks";
    default: return null;
  }
}
