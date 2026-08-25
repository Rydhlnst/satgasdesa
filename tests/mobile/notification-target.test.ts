import { describe, expect, it } from "vitest";

import { notificationTarget } from "../../mobile/src/notifications/target";
import { retryDelayMs } from "../../mobile/src/offline/retry";

describe("notificationTarget", () => {
  it("routes every actionable notification type to its native screen", () => {
    expect(notificationTarget({ relatedEntityType: "FUND_REQUEST", relatedEntityId: "request-1" })).toBe("/fund-request/request-1");
    expect(notificationTarget({ relatedEntityType: "FINANCIAL_TRANSACTION", relatedEntityId: "transaction-1" })).toBe("/transaction/transaction-1");
    expect(notificationTarget({ relatedEntityType: "EXCAVATOR", relatedEntityId: "excavator-1" })).toBe("/excavator/excavator-1");
    expect(notificationTarget({ relatedEntityType: "DUE_PAYMENT", relatedEntityId: "payment-1" })).toBe("/finance");
  });

  it("does not navigate for incomplete or non-actionable notifications", () => {
    expect(notificationTarget({ relatedEntityType: "BUDGET_PERIOD" })).toBeNull();
    expect(notificationTarget({ relatedEntityType: "UNKNOWN", relatedEntityId: "record-1" })).toBeNull();
  });
});

describe("retryDelayMs", () => {
  it("uses bounded exponential backoff", () => {
    expect(retryDelayMs(1)).toBe(15_000);
    expect(retryDelayMs(3)).toBe(60_000);
    expect(retryDelayMs(20)).toBe(15 * 60_000);
  });
});
