# Feature Inventory

Audit date: 2026-09-01

| Area | Main routes | Key roles | Primary actions / APIs | Static result |
|---|---|---|---|---|
| Auth and session | `/login`, `/forgot-password`, `/profile`, `/security` | All | Login, session refresh, sign out | Covered in code; device flow not executed |
| Dashboard and navigation | `/dashboard`, `/notifications`, `/more` | All | Date range, navigation, refresh | Bottom navigation and date-range wiring present |
| Blocks and map | `/monitoring`, `/map`, `/block/new`, `/block/[id]` | Pimpinan, field officer | Block CRUD, MapTiler/MapLibre, GPS | Static configuration present; staging map not device-tested |
| Field workers | `/workers`, `/worker/new`, `/worker/[id]` | Pimpinan, field officer | Worker CRUD, assignment | Action is below list/empty state; device validation pending |
| Field tasks | `/tasks`, `/task/new`, `/task/[id]` | Pimpinan, field officer | Task CRUD, assignment, completion | Action is below list/empty state; device validation pending |
| Field evidence | `/inspections`, `/inspection/new`, `/inspection/[id]`, `/information*`, `/realizations*` | Pimpinan, field officer | Forms, media evidence, GPS | Static form validation present; E2E pending |
| Dues and payments | `/finance`, `/due/[id]`, `/due/new`, `/payment/new`, `/payment/[id]` | Treasurer, field officer | Record payment, confirm/reject/reverse, evidence | Current working tree exposes treasurer confirmation |
| Finance transactions | `/transactions`, `/transaction/new`, `/transaction/[id]` | Treasurer, leadership | Create, approve, reject | Backend/UI workflow exists; role seed mismatch found |
| Budget | `/budgets`, `/budget/new`, `/budget/[id]` | Treasurer, leadership | Create, verify, approve, progress | Role seed mismatch; progress update has no visible mobile caller |
| Fund requests | `/proposals`, `/proposal/new`, `/proposal/[id]` | Treasurer, leadership | Submit, verify, approve | Static workflow wiring present; E2E pending |
| Reports and admin | `/reports`, `/admin`, `/actors` | Leadership, admin | Reports, RBAC, actor management | Static route coverage; permission matrix needs alignment |
