import { describe, expect, it } from "vitest";
import { z } from "zod";

import { blockFormSchema } from "@/mobile/src/block-form-schema";
import { createBudgetPeriodSchema, createRealizationSchema } from "@/src/features/budgets/schema";
import { createDailyInformationSchema } from "@/src/features/daily-information/schema";
import { recordDuePaymentSchema } from "@/src/features/dues/schema";
import { businessActorSchema, paymentVerificationSchema } from "@/src/features/field-operations/schema";
import { fieldTaskSchema, fieldWorkerSchema } from "@/src/features/field-work/schema";
import { createFinancialTransactionSchema } from "@/src/features/finance/schema";
import { createFundRequestSchema } from "@/src/features/fund-requests/schema";
import { createInspectionSchema, inspectionUploadSchema } from "@/src/features/inspections/schema";
import { localizeUserMessage } from "@/mobile/src/lib/feedback";
import { adminInviteFormSchema, adminUserStatusFormSchema, blockArchiveFormSchema, budgetCategoryFormSchema, budgetCategoryPeriodFormSchema, budgetItemFormSchema, budgetPeriodFormSchema, budgetSubcategoryFormSchema, businessActorFormSchema, dueFormSchema, duePaymentIdFormSchema, duePaymentRejectionFormSchema, endAssignmentFormSchema, excavatorEditFormSchema, excavatorFormSchema, excavatorMovementFormSchema, financeCategoryFormSchema, fieldAssignmentFormSchema, forgotPasswordSchema, fundRequestCorrectionFormSchema, fundRequestFormSchema, informationFollowUpFormSchema, informationFormSchema, informationTransitionFormSchema, inspectionFormSchema, loginSchema, passwordSchema, paymentFormSchema, paymentVerificationFormSchema, profileSchema, realizationCorrectionFormSchema, realizationFormSchema, requiredWorkflowDecisionFormSchema, reversalFormSchema, settingsFormSchema, taskFormSchema, taskStatusFormSchema, transactionApprovalFormSchema, transactionFormSchema, workerAssignmentFormSchema, workerFormSchema, workflowDecisionFormSchema } from "@/mobile/src/form-schemas";
import { adminCreateUserFormSchema } from "@/mobile/src/form-schemas";
import { zodFieldErrors } from "@/mobile/src/lib/form-validation";

const blockId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const transactionId = "33333333-3333-4333-8333-333333333333";

const completeUserInputs: Array<[string, z.ZodTypeAny, unknown]> = [
  ["Login", loginSchema, { email: "operator@sejoli.id", password: "SecurePass123" }],
  ["Forgot password", forgotPasswordSchema, { email: "operator@sejoli.id" }],
  ["Profile", profileSchema, { name: "Operator Sejoli", phone: "08123456789", image: "" }],
  ["Password and sessions", passwordSchema, { currentPassword: "OldPass123", newPassword: "NewPass123", confirmPassword: "NewPass123", revokeOtherSessions: "yes" }],
  ["Mobile business actor form", businessActorFormSchema, { actorType: "COMPANY", name: "CV Maju", representativeName: "Andi", contact: "0812", address: "Desa Sejoli", notes: "Aktif" }],
  ["Mobile budget period form", budgetPeriodFormSchema, { periodKey: "2026-08", openingBalance: "100", estimatedIncome: "50" }],
  ["Mobile monthly due form", dueFormSchema, { excavatorId: blockId, payerName: "CV Maju", amountDue: "10000000", dueDate: "2026-08-26" }],
  ["Mobile excavator form", excavatorFormSchema, { unitCode: "EX-001", brand: "Komatsu", model: "PC-200", businessActorId: userId, operatorName: "Dedi", currentBlockId: blockId, entryDate: "2026-08-26", notes: "Siap operasi" }],
  ["Mobile information form", informationFormSchema, { blockId, reportedAt: "2026-08-26", category: "ACTIVITY", priority: "MEDIUM", description: "Pekerjaan dimulai.", documentation: "Foto tersedia." }],
  ["Mobile information follow-up form", informationFollowUpFormSchema, { note: "Petugas sudah menindaklanjuti." }],
  ["Mobile information transition form", informationTransitionFormSchema, { status: "IN_PROGRESS", followUp: "Pekerjaan sedang dipantau." }],
  ["Mobile inspection form", inspectionFormSchema, { blockId, inspectedAt: "2026-08-26", excavatorCount: "1", workerCount: "4", condition: "Aktif", conditionRoad: "Baik", conditionEnvironment: "Aman", conditionActivity: "Normal", findings: "", notes: "" }],
  ["Mobile payment form", paymentFormSchema, { payerName: "CV Maju", paymentDate: "2026-08-26", amount: "1000000", method: "BANK_TRANSFER", notes: "Lunas" }],
  ["Mobile payment verification form", paymentVerificationFormSchema, { verificationStatus: "CONFIRMED", verifiedAt: "2026-08-26", notes: "Sesuai" }],
  ["Mobile transaction form", transactionFormSchema, { transactionAt: "2026-08-26", transactionType: "CASH_OUT", amount: "1000000", description: "Pembelian material." }],
  ["Mobile excavator edit form", excavatorEditFormSchema, { unitCode: "EX-001", brand: "Komatsu", model: "PC-200", operatorName: "Dedi" }],
  ["Mobile excavator movement form", excavatorMovementFormSchema, { movementType: "TRANSFER", toBlockId: blockId, notes: "Pindah lokasi." }],
  ["Mobile assignment form", fieldAssignmentFormSchema, { blockId, fieldOfficerId: userId, startedAt: "2026-08-26" }],
  ["Mobile end assignment form", endAssignmentFormSchema, { id: transactionId, endedAt: "2026-08-26" }],
  ["Mobile worker form", workerFormSchema, { fullName: "Dedi Lapangan", phone: "08123456789", position: "Operator", status: "ACTIVE", notes: "Shift pagi" }],
  ["Mobile worker assignment form", workerAssignmentFormSchema, { workerId: userId, blockId, startedAt: "2026-08-26" }],
  ["Mobile task form", taskFormSchema, { blockId, assignedFieldOfficerId: userId, assignedWorkerId: "", title: "Periksa akses jalan", description: "Dokumentasikan kondisi.", priority: "HIGH", dueDate: "2026-08-30" }],
  ["Mobile budget category form", budgetCategoryFormSchema, { name: "Operasional", sortOrder: "1" }],
  ["Mobile budget subcategory form", budgetSubcategoryFormSchema, { categoryId: blockId, name: "Transportasi", sortOrder: "1" }],
  ["Mobile finance category form", financeCategoryFormSchema, { name: "Material", transactionType: "CASH_OUT", sortOrder: "1" }],
  ["Mobile fund request form", fundRequestFormSchema, { budgetPeriodId: blockId, budgetCategoryId: userId, budgetSubcategoryId: "", blockId: "", title: "Perbaikan jalan", description: "Pengadaan material.", amount: "1000000", requestedAt: "2026-08-26" }],
  ["Mobile fund request correction form", fundRequestCorrectionFormSchema, { budgetPeriodId: blockId, budgetCategoryId: userId, title: "Perbaikan jalan", description: "Pengadaan material.", amount: "1000000", requestedAt: "2026-08-26", reason: "Perubahan volume." }],
  ["Mobile realization form", realizationFormSchema, { budgetItemId: blockId, fundRequestId: "", activity: "Perataan jalan", realizationDate: "2026-08-26", requestedAmount: "500000", receiptNumber: "KWT-1", description: "Pembayaran material." }],
  ["Mobile realization correction form", realizationCorrectionFormSchema, { budgetItemId: blockId, activity: "Perataan jalan", realizationDate: "2026-08-26", requestedAmount: "500000", description: "Pembayaran material.", reason: "Koreksi volume." }],
  ["Mobile budget item form", budgetItemFormSchema, { groupId: blockId, subcategoryId: "", name: "Material jalan", allocatedAmount: "1000000", notes: "Prioritas", revisionReason: "" }],
  ["Mobile budget category period form", budgetCategoryPeriodFormSchema, { periodId: blockId, categoryId: userId }],
  ["Mobile workflow decision form", workflowDecisionFormSchema, { notes: "Sesuai pemeriksaan." }],
  ["Mobile required workflow decision form", requiredWorkflowDecisionFormSchema, { notes: "Alasan perlu dicatat." }],
  ["Mobile reversal form", reversalFormSchema, { reason: "Koreksi pencatatan." }],
  ["Mobile admin invite form", adminInviteFormSchema, { name: "Admin Sejoli", email: "admin@sejoli.id", roleId: "PETUGAS_LAPANGAN" }],
  ["Mobile admin create account form", adminCreateUserFormSchema, { name: "Admin Sejoli", email: "admin@sejoli.id", roleId: "PETUGAS_LAPANGAN", password: "SecurePass123" }],
  ["Mobile settings form", settingsFormSchema, { organizationName: "Satgas Desa Sejoli", organizationPhone: "08123456789", monthlyDueAmount: "10000000", roadEntryDueAmount: "5000000", monthlyDueDay: "7", periodKey: "2026-08" }],
  ["Pimpinan/Admin block form", blockFormSchema, {
    code: "BLK-001", name: "Blok Utara", status: "ACTIVE", priority: "NORMAL", latitude: "-6.200000", longitude: "106.816666", areaHectares: "12.5", managerName: "Siti", locationPicName: "Budi", fieldPicName: "Rina", contact: "08123456789", workerCount: "8", operationalCondition: "Beroperasi normal", startDate: "2026-08-01", notes: "Akses aman",
  }],
  ["Pimpinan/Admin budget period", createBudgetPeriodSchema, { periodKey: "2026-08", openingBalance: "100000000", estimatedIncome: "25000000" }],
  ["Bendahara fund request", createFundRequestSchema, { budgetPeriodId: blockId, budgetCategoryId: userId, title: "Perbaikan jalan blok utara", description: "Pengadaan material dan tenaga kerja.", amount: "15000000", requestedAt: "2026-08-26" }],
  ["Bendahara realization", createRealizationSchema, { budgetItemId: blockId, activity: "Perataan jalan", realizationDate: "2026-08-26", requestedAmount: "7500000", description: "Pembayaran tahap pertama." }],
  ["Bendahara financial transaction", createFinancialTransactionSchema, { idempotencyKey: transactionId, transactionAt: "2026-08-26T08:00:00.000Z", transactionType: "CASH_OUT", amount: "7500000", description: "Pembayaran material." }],
  ["Bendahara due payment", recordDuePaymentSchema, { dueId: blockId, idempotencyKey: transactionId, payerName: "CV Maju", paymentDate: "2026-08-26", amount: "10000000", method: "BANK_TRANSFER" }],
  ["Petugas business actor", businessActorSchema, { actorType: "COMPANY", name: "CV Maju Bersama", representativeName: "Andi", contact: "08123456789", address: "Desa Sejoli", notes: "Aktif" }],
  ["Petugas field worker", fieldWorkerSchema, { fullName: "Dedi Lapangan", phone: "08123456789", position: "Operator", status: "ACTIVE", notes: "Shift pagi" }],
  ["Petugas field task", fieldTaskSchema, { blockId, assignedFieldOfficerId: userId, title: "Periksa akses jalan", description: "Dokumentasikan kondisi jalan.", priority: "HIGH", dueDate: "2026-08-30" }],
  ["Petugas inspection", createInspectionSchema, { blockId, inspectedAt: "2026-08-26T08:00:00.000Z", latitude: "-6.2", longitude: "106.8", gpsAccuracy: "12", excavatorCount: "2", workerCount: "8", condition: "Aktif", roadCondition: "Baik", environmentCondition: "Aman", activityCondition: "Normal", findings: "Tidak ada", notes: "Cuaca cerah", photos: [] }],
  ["Petugas daily information", createDailyInformationSchema, { blockId, reportedAt: "2026-08-26T08:00:00.000Z", category: "ACTIVITY", priority: "MEDIUM", description: "Pekerjaan pemadatan dimulai.", documentation: "Dilaporkan oleh petugas." }],
  ["Petugas payment verification", paymentVerificationSchema, { duePaymentId: transactionId, verificationStatus: "CONFIRMED", verifiedAt: "2026-08-26T08:00:00.000Z", latitude: "-6.2", longitude: "106.8", gpsAccuracy: "12", notes: "Bukti sesuai." }],
];

describe("mobile forms validate realistic user input", () => {
  it.each(completeUserInputs)("[OK] accepts complete input for %s", (_name, schema, input) => {
    expect(schema.safeParse(input).success).toBe(true);
  });

  it("[OK] treats blank optional block values like the mobile form does", () => {
    const result = blockFormSchema.safeParse({
      code: "BLK-002", name: "Blok Selatan", status: "NOT_OPERATING", priority: "LOW", latitude: "-6.2", longitude: "106.8", areaHectares: "", managerName: "", locationPicName: "", fieldPicName: "", contact: "", workerCount: "", operationalCondition: "Belum beroperasi", startDate: "", notes: "",
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.workerCount).toBe(0);
  });

  it("[OK] normalizes blank optional mobile fields", () => {
    expect(businessActorFormSchema.safeParse({ actorType: "COMPANY", name: "CV Maju", representativeName: "", contact: "", address: "", notes: "" }).success).toBe(true);
    expect(excavatorFormSchema.safeParse({ unitCode: "EX-001", brand: "Komatsu", model: "PC-200", businessActorId: userId, operatorName: "", currentBlockId: "", entryDate: "", notes: "" }).success).toBe(true);
    expect(informationFormSchema.safeParse({ blockId: "", reportedAt: "", category: "ACTIVITY", priority: "MEDIUM", description: "Pekerjaan" }).success).toBe(true);
    expect(inspectionFormSchema.safeParse({ blockId, inspectedAt: "", excavatorCount: "0", workerCount: "0", condition: "Aktif", conditionRoad: "Baik", conditionEnvironment: "Aman", conditionActivity: "Normal", findings: "", notes: "" }).success).toBe(true);
    expect(paymentVerificationFormSchema.safeParse({ verificationStatus: "CONFIRMED", verifiedAt: "2026-08-26", notes: "" }).success).toBe(true);
    expect(transactionFormSchema.safeParse({ transactionAt: "2026-08-26", transactionType: "CASH_OUT", categoryId: "", amount: "100", description: "Material" }).success).toBe(true);
    expect(workerFormSchema.safeParse({ fullName: "Dedi", phone: "", position: "", status: "ACTIVE", notes: "" }).success).toBe(true);
    expect(taskFormSchema.safeParse({ blockId, assignedFieldOfficerId: userId, assignedWorkerId: "", title: "Tugas", description: "", priority: "HIGH", dueDate: "" }).success).toBe(true);
    expect(realizationFormSchema.safeParse({ budgetItemId: blockId, fundRequestId: "", activity: "Perataan", realizationDate: "2026-08-26", requestedAmount: "100", receiptNumber: "", description: "Material" }).success).toBe(true);
    expect(budgetItemFormSchema.safeParse({ groupId: blockId, subcategoryId: "", name: "Material", allocatedAmount: "100", notes: "", revisionReason: "" }).success).toBe(true);
    expect(workflowDecisionFormSchema.safeParse({ notes: "" }).success).toBe(true);
  });

  it("[OK] converts numeric form values before API submission", () => {
    const result = paymentFormSchema.safeParse({ payerName: "  CV Maju  ", paymentDate: "2026-08-26", amount: "1000000", method: "BANK_TRANSFER", notes: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.payerName).toBe("CV Maju");
      expect(result.data.amount).toBe(1_000_000);
      expect(result.data.notes).toBeUndefined();
    }
  });

  it("maps schema issues to field-level messages", () => {
    const result = loginSchema.safeParse({ email: "invalid", password: "" });
    expect(result.success).toBe(false);
    if (!result.success) expect(zodFieldErrors(result.error)).toEqual({ email: "Masukkan email yang valid.", password: "Masukkan kata sandi." });
  });

  it("keeps strict workflow errors in Indonesian", () => {
    expect(localizeUserMessage("Confirmed and pending payments cannot exceed the due amount.")).toBe("Total pembayaran yang sudah dikonfirmasi dan masih menunggu tidak boleh melebihi jumlah tagihan.");
    expect(localizeUserMessage("Only confirmed payments can be reversed.")).toBe("Hanya pembayaran yang sudah dikonfirmasi yang dapat dibatalkan.");
    expect(localizeUserMessage("Invalid request data.")).toBe("Data permintaan tidak valid.");
  });

  const invalidUserInputs: Array<[string, z.ZodTypeAny, unknown]> = [
    ["login email", loginSchema, { email: "not-an-email", password: "secret" }],
    ["login password", loginSchema, { email: "operator@sejoli.id", password: "" }],
    ["forgot-password email", forgotPasswordSchema, { email: "wrong-email" }],
    ["profile name", profileSchema, { name: "A", phone: "", image: "" }],
    ["profile avatar URL", profileSchema, { name: "Operator", phone: "", image: "not-a-url" }],
    ["password confirmation", passwordSchema, { currentPassword: "OldPass123", newPassword: "NewPass123", confirmPassword: "Different123", revokeOtherSessions: "yes" }],
    ["monthly due amount", dueFormSchema, { excavatorId: blockId, payerName: "CV Maju", amountDue: "0", dueDate: "2026-08-26" }],
    ["excavator entry pairing", excavatorFormSchema, { unitCode: "EX-001", brand: "Komatsu", model: "PC-200", businessActorId: userId, currentBlockId: blockId, entryDate: "" }],
    ["information date", informationFormSchema, { blockId, reportedAt: "2026-02-30", category: "ACTIVITY", priority: "MEDIUM", description: "Pekerjaan" }],
    ["inspection count", inspectionFormSchema, { blockId, inspectedAt: "2026-08-26", excavatorCount: "1.5", workerCount: "4", condition: "Aktif", conditionRoad: "Baik", conditionEnvironment: "Aman", conditionActivity: "Normal" }],
    ["payment amount", paymentFormSchema, { payerName: "CV Maju", paymentDate: "2026-08-26", amount: "0", method: "CASH" }],
    ["payment verification note", paymentVerificationFormSchema, { verificationStatus: "DISCREPANCY", verifiedAt: "2026-08-26" }],
    ["transaction date", transactionFormSchema, { transactionAt: "2026-02-30", transactionType: "CASH_OUT", amount: "100", description: "Material" }],
    ["block code", blockFormSchema, { code: " ", name: "Blok", status: "ACTIVE", priority: "NORMAL", latitude: "-6.2", longitude: "106.8", managerName: "", locationPicName: "", fieldPicName: "", contact: "", workerCount: "0", operationalCondition: "Normal", notes: "" }],
    ["block latitude", blockFormSchema, { code: "BLK-001", name: "Blok", status: "ACTIVE", priority: "NORMAL", latitude: "-91", longitude: "106.8", managerName: "", locationPicName: "", fieldPicName: "", contact: "", workerCount: "0", operationalCondition: "Normal", notes: "" }],
    ["block operational condition", blockFormSchema, { code: "BLK-001", name: "Blok", status: "ACTIVE", priority: "NORMAL", latitude: "-6.2", longitude: "106.8", managerName: "", locationPicName: "", fieldPicName: "", contact: "", workerCount: "0", operationalCondition: " ", notes: "" }],
    ["budget period", createBudgetPeriodSchema, { periodKey: "2026-13", openingBalance: "100", estimatedIncome: "100" }],
    ["fund request amount", createFundRequestSchema, { budgetPeriodId: blockId, budgetCategoryId: userId, title: "Jalan", description: "Material", amount: "0", requestedAt: "2026-08-26" }],
    ["realization date", createRealizationSchema, { budgetItemId: blockId, activity: "Jalan", realizationDate: "26/08/2026", requestedAmount: "100", description: "Material" }],
    ["transaction amount", createFinancialTransactionSchema, { idempotencyKey: transactionId, transactionType: "CASH_OUT", amount: "-1", description: "Material" }],
    ["due payment method", recordDuePaymentSchema, { dueId: blockId, idempotencyKey: transactionId, payerName: "CV Maju", paymentDate: "2026-08-26", amount: "100", method: "CHEQUE" }],
    ["business actor name", businessActorSchema, { actorType: "COMPANY", name: " ", contact: "0812" }],
    ["worker name", fieldWorkerSchema, { fullName: " ", status: "ACTIVE" }],
    ["task title", fieldTaskSchema, { blockId, assignedFieldOfficerId: userId, title: " " }],
    ["inspection worker count", createInspectionSchema, { blockId, latitude: "-6.2", longitude: "106.8", gpsAccuracy: "10", excavatorCount: "0", workerCount: "-1", condition: "Aktif", roadCondition: "Baik", environmentCondition: "Aman", activityCondition: "Normal", photos: [] }],
    ["daily information description", createDailyInformationSchema, { category: "ACTIVITY", priority: "MEDIUM", description: " " }],
    ["information follow-up note", informationFollowUpFormSchema, { note: " " }],
    ["information transition note", informationTransitionFormSchema, { status: "IN_PROGRESS", followUp: " " }],
    ["assignment block", fieldAssignmentFormSchema, { blockId: "", fieldOfficerId: userId, startedAt: "2026-08-26" }],
    ["assignment date", fieldAssignmentFormSchema, { blockId, fieldOfficerId: userId, startedAt: "2026-02-30" }],
    ["worker name", workerFormSchema, { fullName: " ", status: "ACTIVE" }],
    ["worker assignment block", workerAssignmentFormSchema, { workerId: userId, blockId: "", startedAt: "2026-08-26" }],
    ["task priority", taskFormSchema, { blockId, assignedFieldOfficerId: userId, title: "Task", priority: "INVALID" }],
    ["budget category name", budgetCategoryFormSchema, { name: " ", sortOrder: "0" }],
    ["budget subcategory category", budgetSubcategoryFormSchema, { categoryId: "", name: "Transportasi", sortOrder: "0" }],
    ["finance category sort", financeCategoryFormSchema, { name: "Material", transactionType: "CASH_OUT", sortOrder: "-1" }],
    ["fund request date", fundRequestFormSchema, { budgetPeriodId: blockId, budgetCategoryId: userId, title: "Jalan", description: "Material", amount: "100", requestedAt: "2026-02-30" }],
    ["realization date", realizationFormSchema, { budgetItemId: blockId, activity: "Jalan", realizationDate: "2026-02-30", requestedAmount: "100", description: "Material" }],
    ["excavator movement destination", excavatorMovementFormSchema, { movementType: "TRANSFER", toBlockId: "", notes: "Pindah" }],
    ["fund correction reason", fundRequestCorrectionFormSchema, { budgetPeriodId: blockId, budgetCategoryId: userId, title: "Jalan", description: "Material", amount: "100", requestedAt: "2026-08-26", reason: " " }],
    ["realization correction reason", realizationCorrectionFormSchema, { budgetItemId: blockId, activity: "Jalan", realizationDate: "2026-08-26", requestedAmount: "100", description: "Material", reason: " " }],
    ["budget item amount", budgetItemFormSchema, { groupId: blockId, name: "Material", allocatedAmount: "-1" }],
    ["admin invite email", adminInviteFormSchema, { name: "Admin", email: "wrong", roleId: "PETUGAS_LAPANGAN" }],
    ["admin create account password", adminCreateUserFormSchema, { name: "Admin Sejoli", email: "admin@sejoli.id", roleId: "PETUGAS_LAPANGAN", password: "short" }],
    ["settings period", settingsFormSchema, { organizationName: "Satgas", organizationPhone: "", monthlyDueAmount: "100", roadEntryDueAmount: "100", monthlyDueDay: "7", periodKey: "2026-13" }],
    ["reversal reason", reversalFormSchema, { reason: " " }],
  ];
  it.each(invalidUserInputs)("[ERR] rejects invalid user input for %s", (_name, schema, input) => {
    expect(schema.safeParse(input).success).toBe(false);
  });

  it("[ERR] requires a note when a field officer reports a payment discrepancy", () => {
    const result = paymentVerificationSchema.safeParse({ duePaymentId: transactionId, verificationStatus: "DISCREPANCY" });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.some((issue) => issue.path[0] === "notes")).toBe(true);
  });

  it("[ERR] rejects user-selected attachments over 10 MB", () => {
    expect(recordDuePaymentSchema.safeParse({ dueId: blockId, idempotencyKey: transactionId, payerName: "CV Maju", paymentDate: "2026-08-26", amount: "100", method: "BANK_TRANSFER", evidenceKey: "x" }).success).toBe(true);
    expect(inspectionUploadSchema.safeParse({ inspectionId: blockId, contentType: "image/jpeg", size: 10 * 1024 * 1024 + 1, originalName: "inspection.jpg" }).success).toBe(false);
    expect(createInspectionSchema.safeParse({ blockId, latitude: "-6.2", longitude: "106.8", gpsAccuracy: "10", excavatorCount: "0", workerCount: "0", condition: "Aktif", roadCondition: "Baik", environmentCondition: "Aman", activityCondition: "Normal", photos: [{ storageKey: "photo", contentType: "image/jpeg", size: 10 * 1024 * 1024 + 1 }] }).success).toBe(false);
  });

  it("keeps mobile action payloads within server contracts", () => {
    expect(dueFormSchema.safeParse({ excavatorId: blockId, payerName: "CV Maju", amountDue: "5000000", dueDate: "2026-08-26" }).success).toBe(true);
    expect(budgetItemFormSchema.safeParse({ groupId: "", name: "Material", allocatedAmount: "100" }).success).toBe(false);
    expect(adminCreateUserFormSchema.safeParse({ name: "Admin Sejoli", email: "admin@sejoli.id", roleId: "UNKNOWN", password: "SecurePass123" }).success).toBe(false);
    expect(blockArchiveFormSchema.safeParse({ id: "not-an-id", archived: true }).success).toBe(false);
    expect(taskStatusFormSchema.safeParse({ id: transactionId, status: "INVALID" }).success).toBe(false);
    expect(adminUserStatusFormSchema.safeParse({ id: transactionId, status: "INVALID" }).success).toBe(false);
    expect(transactionApprovalFormSchema.safeParse({ id: transactionId }).success).toBe(true);
    expect(duePaymentIdFormSchema.safeParse({ duePaymentId: transactionId }).success).toBe(true);
    expect(duePaymentRejectionFormSchema.safeParse({ duePaymentId: transactionId, reason: " " }).success).toBe(false);
  });
});
