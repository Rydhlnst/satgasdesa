# Mobile App schema map

Scope: `mobile/app` input and mutation flows. Server schemas remain the final authority; this map records the mobile validation layer and every payload adapter.

## User-input forms

| Mobile route / flow | Mobile schema | Server contract | Adapter / boundary checks | Test |
| --- | --- | --- | --- | --- |
| Login | `loginSchema` | Better Auth sign-in payload | Email format; password required | `tests/mobile/user-input-validation.test.ts` |
| Forgot password | `forgotPasswordSchema` | Auth reset-email payload | Email format and 255-char limit | same |
| Profile | `profileSchema` | `updateMyProfileSchema` | Empty phone/image become valid optional values; image limit matches server at 2,000 chars | same |
| Password and sessions | `passwordSchema` | Auth change-password payload | Confirmation equality; `yes/no` converted to boolean | same |
| Business actor create/edit | `businessActorFormSchema` | `businessActorSchema`, `updateBusinessActorSchema` | Edit adds route `id` | same |
| Block create/edit | `blockFormSchema` | `src/features/blocks/schema.ts:blockFormSchema` | Blank optional area/date; blank worker count becomes `0`; photo is a separate upload flow | same + server CRUD tests |
| Excavator create | `excavatorFormSchema` | `registerExcavatorSchema` | Current block and entry date must be supplied together; photo is separate | same |
| Excavator edit | `excavatorEditFormSchema` | `updateExcavatorSchema` | Edit adds route `id` | same |
| Excavator movement | `excavatorMovementFormSchema` | `recordExcavatorMovementSchema` | Entry/transfer requires destination; route `id` is added | same |
| Monthly due | `dueFormSchema` | `createDueSchema` | Positive configured amount; server still verifies the configured monthly default; route adds `dueType` and `referenceKey` | same |
| Record payment | `paymentFormSchema` | `recordDuePaymentSchema` | Adds due ID, UUID idempotency key, and uploaded evidence key; checks monthly date window and outstanding balance | same + payment rules |
| Payment verification | `paymentVerificationFormSchema` | `paymentVerificationSchema` | Adds payment ID, ISO date, GPS coordinates, and evidence key; discrepancy requires note | same |
| Financial transaction | `transactionFormSchema` | `createFinancialTransactionSchema` | Adds UUID idempotency key and ISO timestamp; optional category is normalized | same |
| Field assignment | `fieldAssignmentFormSchema` | `fieldAssignmentSchema` | Mobile currently submits the required subset | same |
| End field/worker assignment | `endAssignmentFormSchema` | `endFieldAssignmentSchema`, `endWorkerAssignmentSchema` | UUID and valid calendar date required | same |
| Worker create/edit | `workerFormSchema` | `fieldWorkerSchema`, `updateFieldWorkerSchema` | Edit adds route `id` | same |
| Worker assignment | `workerAssignmentFormSchema` | `workerAssignmentSchema` | Adds worker route `id` when opened from worker detail | same |
| Field task create | `taskFormSchema` | `fieldTaskSchema` | Blank optional worker/date become undefined | same |
| Field task status | `taskStatusFormSchema` | `updateFieldTaskSchema` | Validates route task ID and status before every transition | same |
| Budget period | `budgetPeriodFormSchema` | `createBudgetPeriodSchema` | Currency input is parsed to integer rupiah | same |
| Budget category/subcategory | `budgetCategoryFormSchema`, `budgetSubcategoryFormSchema` | `create/updateBudgetCategorySchema`, `create/updateBudgetSubcategorySchema` | Edit adds ID and active flag | same |
| Budget category assignment | `budgetCategoryPeriodFormSchema` | `addBudgetCategoryToPeriodSchema` | Period and category UUIDs required | same |
| Budget item allocation | `budgetItemFormSchema` | `createBudgetItemSchema`, `updateBudgetItemSchema`, `reviseBudgetItemSchema` | Group UUID is required; update/revision adapters select only server-supported fields | same |
| Budget verification/approval | `workflowDecisionFormSchema` | `verifyBudgetPeriodSchema`, `approveBudgetPeriodSchema` | `notes` is renamed to `approvalNotes` for approval | same |
| Fund request create/edit | `fundRequestFormSchema` | `createFundRequestSchema`, `updateFundRequestSchema` | Optional subcategory/block blanks become undefined | same |
| Fund request correction | `fundRequestCorrectionFormSchema` | `correctFundRequestSchema` | Adds request ID and correction reason | same |
| Fund request workflow | `workflowDecisionFormSchema`, `requiredWorkflowDecisionFormSchema` | `transitionFundRequestSchema` | Required note for revision/rejection/cancellation paths | same |
| Realization create/edit | `realizationFormSchema` | `createRealizationSchema`, `updateRealizationSchema` | Optional fund request blank becomes undefined; currency parsed to integer | same |
| Realization correction | `realizationCorrectionFormSchema` | `correctRealizationSchema` | Adds realization ID and reason | same |
| Realization workflow/reversal | `workflowDecisionFormSchema`, `requiredWorkflowDecisionFormSchema`, `reversalFormSchema` | `transitionRealizationSchema`, `reverseRealizationSchema` | Required note/reason on destructive decisions | same |
| Inspection | `inspectionFormSchema` | `createInspectionSchema` | Renames condition fields; GPS is captured before submit; photos are separately size-checked/uploaded; offline queue preserves the validated base payload | same + inspection tests |
| Daily information create | `informationFormSchema` | `createDailyInformationSchema` | Adds ISO date, GPS, and attachment metadata | same |
| Daily information follow-up/status | `informationFollowUpFormSchema`, `informationTransitionFormSchema` | `addDailyInformationFollowUpSchema`, `transitionDailyInformationSchema` | ID is added; transition always requires follow-up text | same |
| Admin account create/invite | `adminCreateUserFormSchema`, `adminInviteFormSchema` | Mobile admin user route schema | Role is restricted to `PIMPINAN`, `BENDAHARA`, or `PETUGAS_LAPANGAN` | same + direct route tests |
| Admin user status | `adminUserStatusFormSchema` | Mobile admin user PATCH schema | Validates UUID and `ACTIVE/INACTIVE` before request | same |
| Admin settings | `settingsFormSchema` | `updateSystemSettingsSchema` in settings service | Flat editable fields are validated, then merged into the complete nested settings object returned by the server | same + direct route tests |

## Non-form actions now guarded on mobile

These were button-driven mutations rather than text forms, but they can still produce invalid requests if a stale or malformed route/list item is used:

- block archive/restore: `blockArchiveFormSchema`
- task status transition: `taskStatusFormSchema`
- transaction approval: `transactionApprovalFormSchema`
- due payment confirmation: `duePaymentIdFormSchema`
- due payment rejection: `duePaymentRejectionFormSchema`

The server continues to validate every payload. The mobile schemas only provide earlier, user-readable failures and prevent avoidable requests.

## Intentional server-only contracts

Filters, signed-media upload/download metadata, GPS coordinates, attachment metadata, idempotency keys, and route identifiers are also validated server-side. The mobile UI either obtains these values from controlled pickers/device APIs or sends them through dedicated upload helpers. They are not duplicated as editable user forms.

## Validation status

- All mobile form schemas are exercised with realistic valid values and invalid boundary values.
- Currency inputs normalize display values such as `Rp. 10.000.000,00` back to integer rupiah before validation/API submission.
- Empty states are used when optional server data, including budget category-period detail, is unavailable rather than sending an invalid period ID.
- Server errors remain visible through the mobile error mapper with request ID and deployment guidance where applicable.

Remaining gap: live role-by-role CRUD, storage uploads, and Coolify deployment state require an integration/device test environment with authenticated accounts and disposable data.

## Read/filter contracts used by mobile

These are not editable records, but mobile filter/date-range/search controls still terminate at server schemas:

| Mobile area | Server schema |
| --- | --- |
| Budgets and budget categories | `budgetPeriodFiltersSchema`, `budgetCategoryFiltersSchema` |
| Business actors | `businessActorFiltersSchema` |
| Dues and payments | `duesFiltersSchema`, `duePaymentFiltersSchema` |
| Excavators | `excavatorFiltersSchema` |
| Finance and transactions | `financeCategoryFiltersSchema`, `financialTransactionFiltersSchema` |
| Fund requests and realizations | `fundRequestFiltersSchema`, `realizationFiltersSchema` |
| Field tasks and workers | `taskFiltersSchema`, `workerFiltersSchema` |
| Daily information and inspections | `dailyInformationFiltersSchema`, `inspectionFiltersSchema` |
| Reports | `monthlyReportPeriodSchema`, `reportFiltersSchema`, `monthlyReportFormatSchema` |

## Media contracts

The server validates every upload/download payload and storage scope: block photo schemas, excavator photo schemas, inspection upload/photo schemas, due-payment evidence schemas, payment-verification upload schema, financial-transaction evidence schemas, budget-item attachment schemas, realization evidence schemas, daily-information attachment schemas, and fund-request attachment schemas. Mobile limits user-selected images before upload and uses server-issued scoped keys; it never accepts a user-entered storage path.

## Read-only routes

`dashboard`, `assignments` read mode, `blocks/[id]` read sections, `budgets`, `finance`, `information`, `inspections`, `map`, `monitoring`, `notifications`, `offline-queue`, `proposals`, `reports`, `realizations`, `tasks`, `transactions`, `workers`, and `excavators` have no editable record form beyond the mapped controls above. Their failure paths use loading/error/empty states and retry without submitting a write payload.
