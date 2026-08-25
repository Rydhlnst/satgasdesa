import { describe, expect, it } from "vitest";

import { assertFundRequestActor, assertFundRequestTransition, permissionForFundRequestTransition } from "@/src/features/fund-requests/policy";
import { PERMISSIONS, ROLE_PERMISSIONS, ROLES } from "@/src/lib/permissions/constants";

describe("fund request authorization policy", () => {
  it("enforces the approval workflow and required permission", () => {
    expect(() => assertFundRequestTransition("DRAFT", "SUBMITTED")).not.toThrow();
    expect(() => assertFundRequestTransition("DRAFT", "APPROVED")).toThrow("Cannot change fund request");
    expect(permissionForFundRequestTransition("DRAFT", "SUBMITTED")).toBe(PERMISSIONS.FUND_REQUEST_CREATE);
    expect(permissionForFundRequestTransition("SUBMITTED", "VERIFIED")).toBe(PERMISSIONS.FUND_REQUEST_VERIFY);
    expect(permissionForFundRequestTransition("VERIFIED", "APPROVED")).toBe(PERMISSIONS.FUND_REQUEST_APPROVE);
  });

  it("prevents self-review and unauthorized submission", () => {
    expect(() => assertFundRequestActor("creator", "creator", "VERIFIED")).toThrow("cannot be reviewed or approved by its creator");
    expect(() => assertFundRequestActor("creator", "other-user", "SUBMITTED")).toThrow("Only the request creator");
    expect(() => assertFundRequestActor("creator", "reviewer", "VERIFIED")).not.toThrow();
  });

  it("keeps approval permissions outside field and finance roles", () => {
    expect(ROLE_PERMISSIONS[ROLES.PETUGAS_LAPANGAN]).not.toContain(PERMISSIONS.FUND_REQUEST_APPROVE);
    expect(ROLE_PERMISSIONS[ROLES.BENDAHARA]).not.toContain(PERMISSIONS.FUND_REQUEST_APPROVE);
    expect(ROLE_PERMISSIONS[ROLES.PIMPINAN]).toContain(PERMISSIONS.FUND_REQUEST_APPROVE);
  });
});
