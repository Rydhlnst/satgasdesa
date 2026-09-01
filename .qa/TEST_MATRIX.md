# Test Matrix

| ID | Scenario | Priority | Current status |
|---|---|---:|---|
| PAY-001 | Treasurer sees pending payment confirmation | P0 | Static pass; staging/device pending |
| PAY-002 | Confirm payment creates cash-in transaction and updates balance | P0 | Backend workflow mapped; staging mutation pending |
| PAY-003 | Duplicate confirmation is rejected safely | P0 | Service guard exists; API test pending |
| PAY-004 | Uploaded evidence is visible before confirmation | P1 | UI path exists; device pending |
| FIN-001 | Treasurer can approve eligible transaction | P0 | Blocked by seed-role gap |
| BUD-001 | Treasurer can verify budget | P0 | Blocked by seed-role gap |
| BUD-002 | Budget progress update has an exposed mobile action | P1 | No mobile caller found |
| FIELD-001 | Field officer completes GPS verification | P0 | Workflow exists; device/staging pending |
| FIELD-002 | Field officer can create only policy-approved records | P1 | Role policy mismatch needs decision |
| UI-001 | Empty-state action remains above bottom navigation | P0 | Static pass for tasks/workers; screenshots pending |
| UI-002 | Date range changes refresh active data in place | P1 | Static pass; device pending |
| E2E-001 | Maestro role flows use current Indonesian labels | P1 | Fails review: selectors are stale |
