# SATGAS DESA SEJOLI — Technical Project Specification V1

> **Purpose:** Implementation blueprint for an AI coding agent / software developer.  
> **Product:** Internal SATGAS DESA SEJOLI information system.  
> **Primary clients:** Desktop/laptop dashboard and Android/mobile through an installable PWA.  
> **Architecture principle:** Keep V1 simple, maintainable, auditable, and inexpensive. Do not introduce infrastructure that is not required by the business.

---

## 1. Product Context

SATGAS DESA SEJOLI requires one centralized internal application for:

- Monitoring 30 blocks.
- Managing block managers/persons in charge.
- Tracking excavators per unit and their movement/history.
- Field inspections using GPS and photos.
- Monthly excavator dues.
- Road-entry dues.
- Payments and outstanding receivables.
- Cash/financial transactions.
- Monthly budget allocation.
- Budget realization and approval.
- Daily information, complaints, incidents, and follow-up.
- Management dashboard.
- Monthly reports and exports.
- Audit trail for important actions.

Initial usage is internal. The architecture must comfortably support growth toward approximately 100 registered users without introducing microservices or unnecessary distributed infrastructure.

---

## 2. Core Engineering Principles

1. Build a **modular monolith**, not microservices.
2. Use **one Next.js full-stack codebase**.
3. Desktop and mobile share the same business logic and components.
4. Desktop MUST have a proper desktop dashboard layout. Do not stretch a mobile UI onto desktop.
5. Mobile MUST be optimized for field operation and installable as a PWA.
6. Financial records and approved transactions must prioritize correctness and auditability over convenience.
7. Reuse shared UI components. Avoid duplicating similar tables, forms, dialogs, filters, status badges, uploaders, and page layouts.
8. Prefer ShadCN UI primitives and shared application components over custom one-off UI.
9. Do not introduce Redis, queues, microservices, Kubernetes, or a separate backend in V1 unless a concrete requirement appears.
10. Keep hosting portable between Node.js-capable shared hosting and a VPS.

---

## 3. Recommended Tech Stack

### Application

- Next.js — App Router
- React
- TypeScript
- Tailwind CSS
- ShadCN UI
- Lucide Icons

### Forms & Validation

- React Hook Form
- Zod
- Shared Zod schemas where client/server validation rules are identical

### Backend

Use Next.js full stack:

- Server Components for read-heavy pages where appropriate
- Server Actions for authenticated mutations where appropriate
- Route Handlers for endpoints needed by uploads, PWA, exports, or integration boundaries
- Do NOT create a separate Express/Hono/Nest backend for V1

### Authentication

- Better Auth
- Email + password
- Email verification
- Session-based authentication
- Admin-created internal accounts
- No public registration page

### Authorization

Implement RBAC using roles + permissions.

Initial roles:

- `SUPER_ADMIN` / `PIMPINAN`
- `BENDAHARA`
- `PETUGAS_LAPANGAN`

Do not scatter hard-coded `role === "..."` conditions throughout the UI.

Centralize permission checks.

Example permissions:

```text
USER_READ
USER_MANAGE

BLOCK_READ
BLOCK_CREATE
BLOCK_UPDATE

EXCAVATOR_READ
EXCAVATOR_MANAGE

INSPECTION_READ
INSPECTION_CREATE

DAILY_INFO_READ
DAILY_INFO_CREATE
DAILY_INFO_UPDATE

DUES_READ
DUES_MANAGE
PAYMENT_CREATE

FINANCE_READ
FINANCE_CREATE

BUDGET_READ
BUDGET_CREATE
BUDGET_VERIFY
BUDGET_APPROVE

REALIZATION_READ
REALIZATION_CREATE
REALIZATION_VERIFY
REALIZATION_APPROVE

REPORT_READ
REPORT_EXPORT

AUDIT_READ
```

### Database

- PostgreSQL
- Drizzle ORM
- Drizzle migrations

Use database transactions for operations that update multiple financial records.

### File Storage

Use S3-compatible object storage such as Cloudflare R2 or equivalent.

Store actual files outside PostgreSQL.

Database stores:

- object key
- original filename
- MIME type
- size
- uploader
- timestamps
- related entity ID

Use object storage for:

- inspection photos
- transaction evidence
- realization evidence
- supporting documents

### PWA

- Web App Manifest
- Service Worker
- Installable on Android
- Basic static/app-shell caching
- Local draft support for selected field forms
- Online-first transaction submission

**V1 is NOT a full offline-first synchronization system.**

---

## 4. Responsive UX Strategy

The product is one application but has two deliberately different interaction layouts.

### Desktop / Laptop

Use a full dashboard experience:

- Persistent sidebar
- Top header
- Breadcrumbs
- Multi-column KPI cards
- Data tables
- Filter bars
- Desktop dialogs/sheets
- Charts where useful
- Dense financial information
- Multi-column forms where appropriate

Suggested shell:

```text
┌──────────────┬───────────────────────────────────────────┐
│ Sidebar      │ Header / Breadcrumb / User               │
│              ├───────────────────────────────────────────┤
│ Dashboard    │                                           │
│ Monitoring   │ Page Header                               │
│ Keuangan     │                                           │
│ Anggaran     │ KPI / Filters / Table / Content          │
│ Realisasi    │                                           │
│ Informasi    │                                           │
│ Laporan      │                                           │
│ Settings     │                                           │
└──────────────┴───────────────────────────────────────────┘
```

### Mobile / PWA

Optimize for field use:

- Compact header
- Cards instead of overly wide tables
- Bottom navigation for high-frequency actions
- Large touch targets
- Camera/gallery access
- GPS capture
- Quick inspection form
- Sheets/drawers instead of large desktop dialogs
- Sticky primary actions when useful

Never force desktop tables horizontally into the primary mobile experience when a card/list representation is more usable.

---

## 5. Design System

Use ShadCN UI as the base design system.

### Base Components

Prefer:

- `Button`
- `Input`
- `Textarea`
- `Select`
- `Checkbox`
- `RadioGroup`
- `Switch`
- `Card`
- `Badge`
- `Table`
- `Tabs`
- `Dialog`
- `AlertDialog`
- `Sheet`
- `DropdownMenu`
- `Popover`
- `Command`
- `Calendar`
- `Tooltip`
- `Skeleton`
- `Alert`
- `Progress`
- `Separator`
- `Breadcrumb`
- `Pagination`

### Shared Application Components

Create reusable domain-independent components instead of rebuilding UI on every page.

Recommended:

```text
components/
├── app-shell/
│   ├── app-sidebar.tsx
│   ├── desktop-header.tsx
│   ├── mobile-header.tsx
│   ├── mobile-bottom-nav.tsx
│   └── page-container.tsx
│
├── shared/
│   ├── page-header.tsx
│   ├── metric-card.tsx
│   ├── status-badge.tsx
│   ├── data-table.tsx
│   ├── data-table-toolbar.tsx
│   ├── empty-state.tsx
│   ├── error-state.tsx
│   ├── loading-state.tsx
│   ├── confirm-dialog.tsx
│   ├── detail-field.tsx
│   ├── timeline.tsx
│   ├── money-display.tsx
│   ├── date-display.tsx
│   ├── user-avatar.tsx
│   ├── search-input.tsx
│   ├── filter-sheet.tsx
│   └── responsive-list.tsx
│
├── forms/
│   ├── form-field-wrapper.tsx
│   ├── money-input.tsx
│   ├── date-picker-field.tsx
│   ├── photo-uploader.tsx
│   ├── evidence-uploader.tsx
│   ├── gps-capture-field.tsx
│   └── form-actions.tsx
│
└── domain/
    ├── block-status-badge.tsx
    ├── excavator-status-badge.tsx
    ├── payment-status-badge.tsx
    ├── approval-status-badge.tsx
    ├── priority-badge.tsx
    └── budget-progress.tsx
```

### UI Consistency Rules

- One semantic status must always use the same badge component.
- Money must always use the shared currency formatter.
- Dates must always use shared formatting utilities.
- Confirmation for destructive/high-impact actions must use a shared confirmation pattern.
- Forms must use shared field wrappers and consistent error messages.
- List pages should reuse the same search/filter/pagination conventions.
- Do not create custom arbitrary colors per page.
- Keep visual hierarchy restrained and professional.
- Financial warnings such as `OVER_ALLOCATION` must be visually obvious.
- Loading, empty, error, and unauthorized states must be designed, not ignored.

---

## 6. Application Modules

### 6.1 Authentication & Users

Features:

- Login
- Logout
- Email verification
- Forgot/reset password
- Admin creates users
- Activate/deactivate user
- Assign role
- View user list
- View relevant account activity

No public sign-up.

Suggested routes:

```text
/login
/verify-email
/forgot-password
/reset-password

/dashboard/settings/users
/dashboard/settings/users/[id]
```

---

## 6.2 Dashboard

The management dashboard should prioritize information requiring attention.

KPIs:

- Total blocks
- Active blocks
- Stopped blocks
- Not-yet-operating blocks
- Current dues obligation
- Payments received
- Outstanding receivables
- Current cash balance
- Current monthly allocation
- Current realization
- Budget absorption percentage
- Open daily information/incidents
- Pending verification
- Over-allocation requests

Provide a `Needs Attention` section for:

- overdue dues
- high-priority incidents
- pending verification
- pending approval
- unresolved daily information
- next month's allocation not prepared

Routes:

```text
/dashboard
```

---

## 6.3 Block Monitoring

Each block contains:

- unique ID
- name/code
- operational status
- latitude
- longitude
- location photo if applicable
- manager/operator
- location PIC
- field PIC
- contact
- worker count
- operational condition
- start date
- notes

Suggested statuses:

```text
ACTIVE
STOPPED
NOT_OPERATING
```

Features:

- List 30 blocks
- Search/filter
- Block detail
- Edit authorized information
- View excavators
- View inspection history
- View related daily information
- View related dues summary

Routes:

```text
/dashboard/blocks
/dashboard/blocks/[id]
/dashboard/blocks/[id]/edit
```

---

## 6.4 Excavator Management

Do not store only an excavator count.

Every excavator is an individual entity.

Fields:

- ID/unit code
- brand
- model
- operator
- current block
- entry date
- exit date
- status

Suggested statuses:

```text
ACTIVE
INACTIVE
EXITED
```

Maintain movement/history records.

An excavator entering a block may generate financial obligations according to the configured business rules.

Routes:

```text
/dashboard/excavators
/dashboard/excavators/new
/dashboard/excavators/[id]
```

---

## 6.5 Field Inspection

Petugas Lapangan can create inspections.

Fields:

- block
- inspector
- inspection timestamp
- GPS latitude
- GPS longitude
- GPS accuracy
- number of excavators observed
- number of workers observed
- condition
- findings
- notes
- maximum 3 photos

### GPS UX

Provide:

`Ambil Lokasi Saya`

Store:

```text
latitude
longitude
accuracy
captured_at
```

Do not continuously track user location.

### Photo UX

Allow:

- camera
- gallery
- max 3 photos

Before upload:

- validate type
- validate size
- resize/compress where appropriate
- show preview
- allow remove/replace before submit

Provide local draft support for incomplete inspection forms where practical.

Routes:

```text
/dashboard/inspections
/dashboard/inspections/new
/dashboard/inspections/[id]
```

On mobile, `new inspection` should be a high-priority quick action.

---

## 6.6 Dues

Initial business rules:

### Monthly Dues

```text
Rp10,000,000 × active excavator
```

per applicable monthly period.

Baseline V1 assumption:

- An excavator active during an applicable period incurs the full monthly obligation.
- No automatic prorating in V1 unless stakeholders explicitly change this rule.

### Road Entry Dues

```text
Rp5,000,000
```

for an applicable excavator entry event.

Baseline assumption:

- Re-entry can generate a new road-entry obligation.
- Keep this rule configurable/isolated because stakeholder confirmation may change it.

### Payment

Payments may be partial.

Statuses:

```text
UNPAID
PARTIAL
PAID
```

Never treat billed/receivable money as available cash until payment is actually recorded.

Fields:

- obligation
- payer
- payment date
- amount
- method
- evidence
- recorder
- timestamp

Routes:

```text
/dashboard/dues
/dashboard/dues/[id]
/dashboard/payments
```

---

## 6.7 Finance

Keep these concepts separate:

- obligation
- receivable
- payment
- cash inflow
- cash outflow
- allocation
- realization

Cash balance must represent actual recorded/authorized cash movements, not unpaid obligations.

Financial records need:

- unique transaction ID
- date/time
- type
- amount
- description
- related record
- evidence
- status
- creator
- timestamps

Avoid floating-point arithmetic for currency.

Use integer smallest units or PostgreSQL `numeric` with an explicit money strategy. The strategy must be consistent across the project.

Routes:

```text
/dashboard/finance
/dashboard/finance/transactions
/dashboard/finance/transactions/[id]
```

---

## 6.8 Monthly Budget Allocation

Budgeting is period-based.

Cycle:

```text
End of current month
→ Proposal for next month
→ Approval
→ Execution
→ Realization
→ Monthly report
→ Next period
```

Initial groups:

```text
A. Pemeliharaan/Pembangunan Infrastruktur Desa
B. Belanja untuk Kegiatan Sosial dan Kegiatan Rutin Bulanan
C. Operasional Pengurus
```

Each group supports sub-items.

Budget period should show:

- opening balance
- estimated income
- available funds
- total allocation
- unallocated funds
- revision history
- approval basis/notes

Routes:

```text
/dashboard/budgets
/dashboard/budgets/[period]
/dashboard/budgets/[period]/edit
```

---

## 6.9 Realization / Expense Requests

Mandatory workflow:

```text
DRAFT
→ SUBMITTED
→ VERIFIED
→ APPROVED / SAH
```

Recommended authority:

```text
Bendahara
DRAFT → SUBMITTED

Authorized verifier/admin
SUBMITTED → VERIFIED

Pimpinan
VERIFIED → SAH
```

Each request must reference:

- budget period
- budget group
- budget sub-item
- requested amount
- description
- evidence
- current allocation
- previous realization
- pending requests
- remaining allocation

### Over Allocation

If:

```text
previous realization
+ pending applicable amount
+ new request
> allocation
```

mark as:

```text
OVER_ALLOCATION
```

V1 recommendation:

- Do not silently block the record.
- Require special/high-authority approval.
- Show the excess amount explicitly.

### Approved / SAH Transactions

Once a financial transaction becomes `SAH`:

- do not directly edit it
- do not hard-delete it

Corrections must use an auditable correction/reversal mechanism.

Routes:

```text
/dashboard/realizations
/dashboard/realizations/new
/dashboard/realizations/[id]
```

---

## 6.10 Daily Information

Categories:

```text
COMPLAINT
INCIDENT
PROSPECTIVE_MANAGER
NOTICE
```

Fields:

- date/time
- reporter
- related block if applicable
- category
- priority
- description
- documentation
- follow-up
- status

Workflow:

```text
NEW
→ RECEIVED
→ IN_PROGRESS
→ COMPLETED / CLOSED
```

Suggested priorities:

```text
LOW
MEDIUM
HIGH
URGENT
```

Routes:

```text
/dashboard/information
/dashboard/information/new
/dashboard/information/[id]
```

---

## 6.11 Reports

V1 reporting:

- Dashboard summaries
- Monthly operational report
- Monthly financial report
- PDF export
- Excel export

Monthly operational report:

- total information
- complaints
- incidents
- prospective managers
- notices
- follow-up status
- open items
- summary by block
- summary by priority

Monthly financial report:

- opening balance
- income
- dues
- payments
- receivables
- allocation
- realization
- remaining allocation
- absorption
- closing balance

Routes:

```text
/dashboard/reports
/dashboard/reports/monthly
```

---

## 6.12 Notifications

V1 uses in-app notifications.

Notification triggers:

- overdue dues
- new excavator entry
- high-priority incident
- expense request waiting verification
- request waiting approval
- over-allocation
- next-month allocation not prepared
- unresolved daily information

WhatsApp/email/push notifications are optional future extensions and should not be required by the core domain model.

---

## 7. Audit Trail

Auditability is mandatory for important records.

Recommended audit event structure:

```text
id
actor_user_id
action
entity_type
entity_id
old_values
new_values
metadata
created_at
```

Potential actions:

```text
CREATE
UPDATE
SUBMIT
VERIFY
APPROVE
REJECT
CORRECT
REVERSE
STATUS_CHANGE
LOGIN
```

Do not expose a normal delete action for audit logs.

Important entities must track:

```text
created_at
updated_at
created_by
updated_by
```

Use soft deletion only where appropriate. Financial/audit history must not disappear because a UI record was removed.

---

## 8. Suggested Data Model

This is a starting model, not a substitute for final migration design.

```text
users
roles
permissions
role_permissions
user_roles

blocks
block_managers
block_history

excavators
excavator_movements

inspections
inspection_photos

dues
due_payments

financial_transactions
transaction_evidence

budget_periods
budget_groups
budget_items
budget_revisions

realization_requests
realization_approvals
realization_evidence

daily_information
daily_information_followups
daily_information_attachments

notifications

audit_logs
```

Prefer explicit relations and foreign keys.

Add indexes to:

- foreign keys
- status fields used heavily in filtering
- period/month fields
- transaction dates
- block IDs
- excavator unit IDs
- notification recipient/status
- audit entity references

Do not prematurely add indexes without query justification beyond obvious relational/filtering paths.

---

## 9. Suggested Project Structure

Use feature/domain organization while retaining Next.js conventions.

```text
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   ├── verify-email/
│   │   ├── forgot-password/
│   │   └── reset-password/
│   │
│   ├── (dashboard)/
│   │   └── dashboard/
│   │       ├── page.tsx
│   │       ├── blocks/
│   │       ├── excavators/
│   │       ├── inspections/
│   │       ├── dues/
│   │       ├── payments/
│   │       ├── finance/
│   │       ├── budgets/
│   │       ├── realizations/
│   │       ├── information/
│   │       ├── reports/
│   │       └── settings/
│   │
│   └── api/
│
├── components/
│   ├── ui/
│   ├── app-shell/
│   ├── shared/
│   ├── forms/
│   └── domain/
│
├── features/
│   ├── auth/
│   ├── users/
│   ├── blocks/
│   ├── excavators/
│   ├── inspections/
│   ├── dues/
│   ├── finance/
│   ├── budgets/
│   ├── realizations/
│   ├── daily-information/
│   ├── reports/
│   └── notifications/
│
├── db/
│   ├── schema/
│   ├── migrations/
│   ├── index.ts
│   └── queries/
│
├── lib/
│   ├── auth/
│   ├── permissions/
│   ├── storage/
│   ├── validation/
│   ├── money/
│   ├── dates/
│   ├── audit/
│   └── utils/
│
└── types/
```

Do not put all business logic directly inside page components or route handlers.

---

## 10. Server-Side Architecture Rules

Separate responsibilities:

```text
UI
↓
Server Action / Route Handler
↓
Authorization
↓
Validation
↓
Domain Service / Business Rule
↓
Database Transaction
↓
Audit Event
↓
Response
```

Example:

```text
approveRealization()
```

must NOT merely execute:

```text
UPDATE realization SET status = 'SAH'
```

It must:

1. authenticate user
2. authorize approval permission
3. validate current workflow state
4. verify related budget period/item
5. recalculate allocation/realisations
6. determine over-allocation state
7. apply approval rule
8. update records transactionally
9. create financial impact if applicable
10. write audit event
11. return result

Financial calculations must be performed server-side.

Never trust totals calculated only by the browser.

---

## 11. Validation Rules

Use Zod schemas for input boundaries.

Examples:

### Inspection

- valid block required
- GPS required when policy requires it
- latitude/longitude valid
- GPS accuracy non-negative
- max 3 photos
- worker count non-negative
- excavator count non-negative

### Payment

- obligation exists
- amount > 0
- amount follows allowed partial-payment rules
- payment date valid
- evidence requirements enforced if configured

### Realization

- valid budget period
- valid budget item
- amount > 0
- workflow transition valid
- user has transition permission
- over-allocation calculation server-side

---

## 12. PWA & Local Draft

V1 PWA goals:

- installable
- fast repeat loads
- application shell caching
- basic offline fallback
- local draft for selected forms

Do NOT promise complete offline transaction synchronization.

For an inspection draft, locally preserve:

- selected block
- textual fields
- counts
- captured GPS
- draft metadata

Handle photo drafts carefully because browser storage limits vary.

The UI must clearly distinguish:

```text
DRAFT LOCAL
NOT SUBMITTED
```

from a successfully saved server record.

Never display a local draft as successfully synchronized when it is not.

---

## 13. Upload Strategy

Max inspection photos: 3.

Recommended flow:

```text
Select Camera/Gallery
→ Preview
→ Validate
→ Compress/Resize
→ Upload
→ Save object metadata
→ Link to domain record
```

Security:

- whitelist image MIME types
- reject dangerous extensions
- randomize storage keys
- do not trust original filename
- enforce server-side size limits
- authorize file access
- avoid public unrestricted bucket access for sensitive financial evidence

---

## 14. Security Requirements

Minimum:

- HTTPS
- secure auth cookies
- email verification
- password reset
- RBAC
- server-side permission enforcement
- Zod validation
- rate limiting where appropriate/available
- protected upload endpoints
- database backups
- audit logs
- no secrets committed to Git
- `.env` / hosting secrets
- production error messages must not leak stack traces or credentials

UI authorization is not security.

A hidden button MUST still be protected by server-side permission checks.

---

## 15. Hosting Strategy

Infrastructure choice remains intentionally portable.

### Option A — Node.js-capable Shared Hosting

Acceptable for initial internal deployment if it supports:

- persistent Node.js application
- supported Node.js version
- Next.js SSR/runtime
- environment variables
- npm build/install
- SSH or adequate deployment tooling
- cron jobs
- outbound connections
- sufficient memory/process limits
- PostgreSQL or external PostgreSQL connectivity

### Option B — Small VPS

Migration target if shared hosting becomes restrictive.

Suggested starting class:

```text
2 vCPU
2–4 GB RAM
SSD/NVMe
Ubuntu
```

Do not architect V1 around provider-specific features that make migration difficult.

---

## 16. Backup

At minimum:

### PostgreSQL

- scheduled daily backup
- retention policy
- backup stored separately from the primary database when possible
- periodically test restore procedure

### Object Storage

Use provider durability/versioning/lifecycle options where practical.

Backup is incomplete if nobody has tested whether it can be restored.

---

## 17. Performance

Target usage is internal and approximately up to 100 registered users.

Optimize for correctness first.

Still implement:

- pagination for large tables
- database indexes
- server-side filtering where datasets grow
- image compression
- lazy loading where useful
- avoid unnecessary client components
- avoid fetching entire histories when a page only needs recent records
- cache read-only/reference data where Next.js caching is appropriate

Do not introduce Redis solely because caching exists.

---

## 18. Financial Integrity Rules

These rules are high priority.

1. Receivables are not cash.
2. Partial payments are supported.
3. Cash changes only from qualifying recorded transactions.
4. Financial calculations run server-side.
5. Approved (`SAH`) transactions are immutable.
6. Corrections use reversal/correction records.
7. Every important state transition is auditable.
8. Budget realization must reference an allocation.
9. Over-allocation is explicitly calculated and displayed.
10. High-authority approval is required for allowed over-allocation.
11. Database transactions protect multi-step financial writes.
12. Never use JavaScript floating-point assumptions for currency calculations.

---

## 19. Workflow State Machines

Do not allow arbitrary status editing from generic forms.

### Realization

```text
DRAFT
  ↓ submit
SUBMITTED
  ↓ verify
VERIFIED
  ↓ approve
SAH
```

Optional rejection/correction flows must be explicit, for example:

```text
SUBMITTED → REJECTED
VERIFIED → REJECTED
```

Do not allow:

```text
DRAFT → SAH
```

unless a future documented business rule explicitly permits it.

### Daily Information

```text
NEW
→ RECEIVED
→ IN_PROGRESS
→ COMPLETED
```

or:

```text
NEW / RECEIVED / IN_PROGRESS
→ CLOSED
```

Transitions must be implemented as explicit commands/actions.

---

## 20. AI Coding Agent Instructions

When implementing this specification:

### MUST

- Read this specification before generating modules.
- Preserve domain terminology.
- Reuse ShadCN and shared components.
- Keep desktop and mobile UX intentionally different where necessary.
- Enforce permissions server-side.
- Validate every mutation.
- Use PostgreSQL foreign keys.
- Use database transactions for financial workflows.
- Record audit events for critical mutations.
- Keep financial business logic outside React components.
- Keep route/page files thin.
- Generate migrations for schema changes.
- Handle loading/error/empty/unauthorized states.
- Ensure forms have accessible labels and validation feedback.
- Confirm destructive/high-impact actions.
- Make mobile field operations usable with one hand where practical.

### MUST NOT

- Introduce microservices.
- Add Redis without a demonstrated need.
- Add a separate API backend without a demonstrated need.
- Store image binary data directly in PostgreSQL.
- Hard-delete approved financial history.
- Allow arbitrary workflow status updates.
- Trust browser-calculated financial totals.
- Duplicate UI components for every module.
- Build mobile UI and merely enlarge it for desktop.
- Add public registration.
- Implement full offline sync unless the scope is explicitly expanded.
- Invent business rules silently when this document marks them as pending confirmation.

---

## 21. Pending Business Confirmations

These items should remain isolated/configurable until stakeholders confirm them:

1. Exact monthly-dues treatment for an excavator entering mid-month.
2. Exact monthly-dues treatment for an excavator exiting mid-month.
3. Whether every excavator re-entry incurs another Rp5,000,000 road-entry due.
4. Exact verifier identity/role between `SUBMITTED` and `VERIFIED`.
5. Exact authority and documentation required for over-allocation approval.
6. Whether monthly financial periods need a formal close/lock process.
7. Required signatures/approval representation on exported reports.
8. Exact payment methods allowed.
9. Whether evidence is mandatory for every payment and expense.
10. Data retention period.

Do not bury these assumptions inside code. Use constants/configuration/domain functions where appropriate.

---

## 22. Suggested Implementation Phases

### Phase 0 — Foundation

- Project setup
- ShadCN
- Shared design system
- Database connection
- Better Auth
- RBAC
- Application shells
- Audit foundation
- Storage abstraction

### Phase 1 — Operational Core

- Users
- Blocks
- Managers/PIC
- Excavators
- Excavator movements
- Inspections
- GPS
- Photo upload
- Daily information

### Phase 2 — Dues & Payments

- Monthly dues
- Road-entry dues
- Partial payments
- Receivables
- Evidence
- Dues dashboard

### Phase 3 — Finance & Budget

- Financial transactions
- Cash balance
- Budget periods
- Groups/sub-items
- Allocations
- Revisions

### Phase 4 — Realization & Approval

- Expense requests
- State machine
- Verification
- Approval
- Over-allocation
- Corrections/reversals
- Audit integration

### Phase 5 — Dashboard & Reporting

- Management KPIs
- Needs Attention
- Monthly recap
- PDF
- Excel

### Phase 6 — PWA & Production Hardening

- Manifest
- Service worker
- local drafts
- responsive field UX
- backups
- security review
- performance review
- deployment
- user acceptance testing

---

## 23. Definition of Done

A feature is NOT done merely because the page renders.

A feature is complete when:

- UI works on intended desktop and mobile breakpoints
- permissions are enforced
- validation exists
- database persistence works
- error states are handled
- loading states are handled
- empty states are handled
- audit requirements are satisfied
- relevant business rules are covered
- destructive/high-impact actions require confirmation
- financial writes are transactional where required
- no obvious duplicated shared component exists
- TypeScript passes
- lint/build passes
- migrations are included
- basic test coverage exists for critical domain rules

---

## 24. Critical Test Scenarios

At minimum test:

1. Unauthorized Petugas cannot approve financial records.
2. Bendahara cannot directly make a transaction `SAH`.
3. Approved transaction cannot be directly edited/deleted.
4. Partial payment correctly leaves a receivable.
5. Receivable does not inflate cash balance.
6. Over-allocation is calculated correctly.
7. Over-allocation requires authorized approval.
8. Duplicate submit does not accidentally create duplicate financial impact.
9. Maximum 3 inspection photos is enforced server-side.
10. GPS values are validated.
11. Deactivated users cannot access protected application areas.
12. Audit log records critical state transitions.
13. Dashboard totals reconcile with source records.
14. Monthly report totals reconcile with underlying transactions.
15. Local PWA draft is never mistaken for a server-submitted inspection.

---

## 25. V1 Non-Goals

Unless explicitly added to scope, V1 does NOT include:

- Native Android application
- iOS native application
- Public citizen portal
- Public user registration
- WhatsApp API integration
- Payment gateway
- Full offline-first synchronization
- Real-time GPS tracking
- Microservices
- Kubernetes
- Redis infrastructure
- AI features
- Complex accounting/general ledger system
- Multi-village SaaS tenancy
- Public API marketplace

Design the code cleanly enough that selected capabilities can be added later without pretending they are V1 requirements.

---

## 26. Product Outcome

The final V1 should feel like one coherent internal operating system for SATGAS DESA SEJOLI:

```text
BLOCK
  ↓
EXCAVATOR
  ↓
FIELD INSPECTION
  ↓
DUES
  ↓
PAYMENT / RECEIVABLE
  ↓
CASH
  ↓
MONTHLY BUDGET
  ↓
REALIZATION
  ↓
APPROVAL
  ↓
REPORTING
  ↓
AUDIT
```

The implementation should remain deliberately boring from an infrastructure perspective and strict from a data-integrity perspective.

**Simple infrastructure. Strong business rules. Consistent shared UI.**
