import { PERMISSIONS, type Permission } from "@/src/lib/permissions/constants";

import { FUND_REQUEST_TRANSITIONS } from "./constants";

export function assertFundRequestTransition(currentStatus: string, nextStatus: string): void {
  const allowed: readonly string[] = FUND_REQUEST_TRANSITIONS[currentStatus as keyof typeof FUND_REQUEST_TRANSITIONS] ?? [];
  if (!allowed.includes(nextStatus)) throw new Error(`Cannot change fund request from ${currentStatus} to ${nextStatus}.`);
}

export function permissionForFundRequestTransition(currentStatus: string, nextStatus: string): Permission {
  if (nextStatus === "SUBMITTED" || nextStatus === "CANCELLED") return PERMISSIONS.FUND_REQUEST_CREATE;
  if (nextStatus === "VERIFIED" || (nextStatus !== "APPROVED" && currentStatus === "SUBMITTED")) return PERMISSIONS.FUND_REQUEST_VERIFY;
  return PERMISSIONS.FUND_REQUEST_APPROVE;
}

export function assertFundRequestActor(currentCreatedBy: string, actorUserId: string, nextStatus: string): void {
  if (["SUBMITTED", "CANCELLED"].includes(nextStatus) && currentCreatedBy !== actorUserId) throw new Error("Only the request creator can submit or cancel this fund request.");
  if (["VERIFIED", "REVISION_REQUIRED", "REJECTED", "APPROVED"].includes(nextStatus) && currentCreatedBy === actorUserId) throw new Error("A fund request cannot be reviewed or approved by its creator.");
}
