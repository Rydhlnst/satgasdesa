# QA Findings

Audit date: 2026-09-01

| ID | Severity | Finding | Status |
|---|---|---|---|
| QA-001 | P0 | `scripts/seed-rbac.mjs` omits `FINANCE_APPROVE`, `BUDGET_VERIFY`, and `BUDGET_PROGRESS_UPDATE` from Bendahara role assignment. | Open; requires policy-aligned seed update and reseed |
| QA-002 | P0 | `mobile/app/due/[id].tsx` imports `mobile/src/components/PaymentActionSheet.tsx`, but the component is untracked and therefore absent from a clean committed checkout unless included. | Open; clean-build blocker |
| QA-003 | P1 | Maestro role flows use English/stale labels while the current app uses Indonesian labels. | Open; test-only defect |
| QA-004 | P1 | `updateBudgetItemProgress` exists in API/backend workflow mapping but no visible mobile action calls it. | Open; feature exposure gap |
| QA-005 | P1 | Canonical Petugas permissions include `PAYMENT_CREATE` and `BUDGET_PROGRESS_UPDATE`, while the QA matrix describes payment creation as Bendahara-only. | Open; product-policy decision required |
| QA-006 | P2 | Expo Doctor reports missing `react-native-web` peer dependency and `.expo` ignore recognition failure in the mobile project context. | Open; configuration warning |
| QA-007 | P2 | Many list screens expose retry but not pull-to-refresh; refresh behavior is not consistent across features. | Open; UX consistency gap |
