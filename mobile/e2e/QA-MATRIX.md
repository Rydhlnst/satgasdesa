# Mobile Route QA Matrix

Run this matrix only against the dedicated staging API, database, media bucket, and seeded role accounts. Do not create, approve, upload, reverse, or delete records in production.

## Every route

- Verify loading, empty, error/retry, offline/sync, long text, large currency, keyboard, 360 px, 390 px, and 412 px layouts.
- Verify touch targets, visible placeholders, inline validation, translated error copy, disabled duplicate submission, and role permissions.

| Area | Routes | Roles and required checks |
| --- | --- | --- |
| Auth | `index`, `login`, `forgot-password` | All roles: invalid credentials, password visibility, reset request, relaunch session. |
| Home and shell | `dashboard`, `notifications`, `more`, `profile`, `profile/security`, `offline-queue` | All roles: bottom navigation, notifications, sign-out, retry and offline queue. |
| Monitoring | `monitoring`, `map`, `blocks/[id]`, `block/new`, `block/edit/[id]`, `assignments` | Leadership and field officer: list/filter/detail; manager: create, edit, archive, assign and end assignment. |
| Workers | `workers`, `worker/new`, `worker/[id]` | Field manager: placeholder, invalid required fields, save, edit, placement, end placement; viewer: read-only. |
| Excavators | `excavators`, `excavator/new`, `excavator/[id]` | Field manager: filter, create, edit, image failure, movement, unavailable block. |
| Inspections | `inspections`, `inspection/new`, `inspection/[id]` | Field officer: step validation, GPS permission denied, photo retry, draft, submit, readonly history. |
| Information | `information`, `information/new`, `information/[id]` | Field officer: validation, GPS/upload states, transitions and follow-up permissions. |
| Tasks | `tasks`, `task/new`, `task/[id]`, `assignments` | Manager: required fields, filters, state transitions, assignment boundaries. |
| Dues and payments | `finance`, `due/new`, `due/[id]`, `payment/[id]`, `payment/verify` | Treasurer: create, amount/date validation, in-app proof, confirm/reject/reverse; field officer: GPS verification; viewer: no hidden mutation. |
| Transactions | `transaction/new`, `transaction/[id]`, `finance-categories` | Treasurer: category availability, amount validation, evidence, approval/reversal confirmations. |
| Budget | `budgets`, `budget/new`, `budget/[id]`, `budget-categories` | Leadership and treasurer: period/item validation, attachment failure, verify/approve/revision permission boundaries. |
| Fund requests | `proposals`, `fund-request/new`, `fund-request/[id]` | Creator, verifier, approver: draft, submit, revision, rejection, approval, attachment state. |
| Realization | `realizations`, `realization/new`, `realization/[id]` | Creator, verifier, approver: form validation, document limits, correction, state transitions, reversal. |
| Reports and admin | `reports`, `admin`, `business-actors`, `business-actor/new`, `business-actor/edit` | Leadership: export error/retry, settings validation, account status, category/actor management. |

## Release gates

1. `pnpm typecheck` passes.
2. Maestro read-only role flows pass for leadership, treasurer, and field officer.
3. Staging mutation flows pass for every form/action listed above with seeded, disposable data.
4. Screenshots for 360 px, 390 px, and 412 px show no overflow or hidden bottom actions.
