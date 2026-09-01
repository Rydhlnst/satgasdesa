# Role and Permission Matrix

Audit date: 2026-09-01. This compares canonical permissions in `src/lib/permissions/constants.ts` with `scripts/seed-rbac.mjs`.

| Role | Canonical permissions missing from seed | Impact |
|---|---|---|
| PIMPINAN | None found in this comparison | No seed gap found |
| BENDAHARA | `FINANCE_APPROVE`, `BUDGET_VERIFY`, `BUDGET_PROGRESS_UPDATE` | Approval/verification controls can be hidden or rejected after deployment |
| PETUGAS_LAPANGAN | `PAYMENT_CREATE`, `BUDGET_PROGRESS_UPDATE` | Payment recording/progress controls are unavailable; confirm whether this is intentional policy |

`PAYMENT_CONFIRM` is now present in the working tree seed and canonical role, but it still requires database reseeding plus a fresh session before staging can verify it.

Policy inconsistency requiring product confirmation: the canonical role grants field-officer payment creation, while the QA matrix describes payment creation as a treasurer action.
