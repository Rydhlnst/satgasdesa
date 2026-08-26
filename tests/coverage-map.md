# API and CRUD test coverage

## Unit and route-contract coverage

| Area | Coverage | Test |
| --- | --- | --- |
| CRUD server schemas | 70 create/update/transition/upload schemas reject empty or unsafe payloads | `tests/api/crud-validation.test.ts` |
| Mobile route authentication | 47 protected list/detail/read/mutation handlers reject unauthenticated requests with `401` | `tests/api/mobile-auth-gate.test.ts` |
| Workflow dispatcher | Malformed JSON, missing action, `__proto__`, and inherited `constructor` actions are rejected before handler execution | `tests/api/workflow-contract.test.ts` |
| Direct admin mutation validation | Invalid JSON, missing fields, and mutually-exclusive update fields return `400` | `tests/api/direct-validation.test.ts` |
| Error safety | Internal database/storage exception text is not returned to clients | `tests/api/error-response.test.ts` |
| Media validation | MIME allowlist, size limit, extension matching, path traversal, and scoped object keys | `tests/api/storage-validation.test.ts` |
| Mobile user input | Realistic Pimpinan/Admin, Bendahara, and Petugas Lapangan form values, invalid values, GPS, dates, money, discrepancy notes, and oversized attachments | `tests/mobile/user-input-validation.test.ts` |
| Due payments | Partial/full payment, overpayment, settlement, reversal, retry identity | `tests/dues/payment-rules.test.ts` |
| Realizations | Exact remaining allocation and over-allocation rejection | `tests/budgets/allocation-rules.test.ts` |
| Fund requests | Workflow transitions, permissions, and creator separation | `tests/fund-requests/policy.test.ts` |
| Evidence | Parent entity scope required before signed download URL | `tests/evidence/download-scope.test.ts` |

## Results

- Latest run: 15 test files, 245 tests passed.
- TypeScript: passed.
- Lint: passed with existing mobile warnings only; zero errors.

## Remaining integration coverage

CRUD happy paths that write to MySQL, transaction rollback behavior, storage-provider uploads, and live role/permission combinations still require an integration suite with disposable MySQL and R2-compatible storage. The current suite deliberately remains deterministic and database-free.
