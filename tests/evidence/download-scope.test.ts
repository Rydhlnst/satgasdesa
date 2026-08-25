import { describe, expect, it } from "vitest";

import { budgetItemAttachmentDownloadSchema, realizationEvidenceDownloadSchema } from "@/src/features/budgets/schema";
import { fundRequestAttachmentDownloadSchema } from "@/src/features/fund-requests/schema";

const parentId = "11111111-1111-4111-8111-111111111111";
const childId = "22222222-2222-4222-8222-222222222222";

describe("evidence download scope", () => {
  it("requires the budget item and matching attachment identity", () => {
    expect(budgetItemAttachmentDownloadSchema.safeParse({ budgetItemId: parentId, attachmentId: childId }).success).toBe(true);
    expect(budgetItemAttachmentDownloadSchema.safeParse({ attachmentId: childId }).success).toBe(false);
  });

  it("requires realization and fund-request parents before issuing downloads", () => {
    expect(realizationEvidenceDownloadSchema.safeParse({ realizationId: parentId, evidenceId: childId }).success).toBe(true);
    expect(fundRequestAttachmentDownloadSchema.safeParse({ fundRequestId: parentId, attachmentId: childId }).success).toBe(true);
    expect(realizationEvidenceDownloadSchema.safeParse({ evidenceId: childId }).success).toBe(false);
    expect(fundRequestAttachmentDownloadSchema.safeParse({ attachmentId: childId }).success).toBe(false);
  });
});
