# Validation Matrix

| Domain | Checked | Result |
|---|---|---|
| Loading, empty, and error states | Static route scan | Present on primary list screens |
| Bottom navigation overlap | `Screen` safe-area logic and non-scroll routes | Reserved space is present for tasks/workers; scrollable screens use shared bottom padding |
| Refresh after mutation | Query invalidation and date-range provider | Present for date changes and current payment confirmation; list pull-to-refresh is inconsistent |
| Date range | Shared `DateRangeProvider` and date picker | In-place invalidation is wired; device interaction pending |
| Currency calculation | Due service and finance UI | `10,000,000` per unit path exists; staging data validation pending |
| Payment evidence | Payment detail/action sheet | Upload/view path exists; clean-build dependency issue found |
| Treasurer confirmation | Permission, API, finance list, due detail | Current working tree adds visible confirmation action and invalidation |
| Authorization | Workflow policy and role seed | Seed-role mismatches remain |
| Map | MapTiler runtime config and native map screen | Static config present; staging/device availability not verified |
| Media UI | Icon-only gallery/camera/close controls | Static implementation found; visual device check pending |
| Responsive layouts | Shared screen primitives and existing QA matrix | Static review only; 360/390/412 screenshots pending |
