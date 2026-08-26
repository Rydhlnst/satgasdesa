import { PERMISSIONS, type Permission } from "@/src/lib/permissions/constants";

import { FUND_REQUEST_TRANSITIONS } from "./constants";

export type FundRequestApprovalDecision = {
  isFinalApproval: boolean;
  approvedCount: number;
  requiredCount: number;
};

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

export function decideFundRequestApproval(requiredApproverIds: readonly string[], approvedApproverIds: readonly string[], actorUserId: string): FundRequestApprovalDecision {
  const required = new Set(requiredApproverIds);
  if (!required.size) throw new Error("No active Pimpinan/Admin approver is configured for fund requests.");
  if (!required.has(actorUserId)) throw new Error("You are not an active Pimpinan/Admin approver for fund requests.");

  const approved = new Set(approvedApproverIds.filter((id) => required.has(id)));
  if (approved.has(actorUserId)) throw new Error("You have already approved this fund request. It is waiting for the other approvers.");

  const approvedCount = approved.size + 1;
  return { isFinalApproval: approvedCount >= required.size, approvedCount, requiredCount: required.size };
}
