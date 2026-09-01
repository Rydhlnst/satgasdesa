# QA Report

Audit date: 2026-09-01

## Result

`PASS WITH WARNINGS` for static validation. Not release-ready for full staging/device sign-off.

## Passed

- Mobile TypeScript check passed.
- Root tests passed: 25 test files, 279 tests.
- Root lint passed.
- RBAC seed JavaScript syntax passed.
- Shared `Screen` reserves bottom-navigation space for the non-scroll task and worker screens; scrollable screens use shared bottom padding.
- Date-range changes invalidate active queries in place.
- Payment confirmation API, permission policy, cache invalidation, and current finance action are wired.

## Release blockers / warnings

- Bendahara role seed is missing three canonical permissions needed by transaction and budget workflows.
- `PaymentActionSheet.tsx` is untracked while a tracked route imports it; a clean checkout can fail to build.
- Maestro selectors are stale and do not match current Indonesian UI labels.
- Expo Doctor reports missing `react-native-web` and `.expo` ignore recognition issues.
- Budget progress has an API/workflow handler but no visible mobile action.
- Full staging mutation, map availability, currency calculation, evidence upload, and bottom-nav screenshots remain unverified.

## Recommendation

Resolve QA-001/QA-002 first, then run the role-based staging mutation matrix and 360/390/412 device screenshot pass before pushing another release build.
