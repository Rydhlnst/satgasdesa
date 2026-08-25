import type { Href } from "expo-router";

type NotificationTargetInput = {
  relatedEntityType?: unknown;
  relatedEntityId?: unknown;
};

export function notificationTarget(input: NotificationTargetInput): Href | null {
  if (typeof input.relatedEntityId !== "string" || !input.relatedEntityId) return null;

  switch (input.relatedEntityType) {
    case "BLOCK": return `/blocks/${input.relatedEntityId}` as Href;
    case "INSPECTION": return `/inspection/${input.relatedEntityId}` as Href;
    case "DAILY_INFORMATION": return `/information/${input.relatedEntityId}` as Href;
    case "DUE": return `/due/${input.relatedEntityId}` as Href;
    case "REALIZATION": return `/realization/${input.relatedEntityId}` as Href;
    case "FINANCIAL_TRANSACTION": return `/transaction/${input.relatedEntityId}` as Href;
    case "FUND_REQUEST": return `/fund-request/${input.relatedEntityId}` as Href;
    case "EXCAVATOR": return `/excavator/${input.relatedEntityId}` as Href;
    case "DUE_PAYMENT": return "/finance";
    default: return null;
  }
}
