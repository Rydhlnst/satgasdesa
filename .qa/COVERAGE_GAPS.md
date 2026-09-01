# Coverage Gaps

- No staging/device execution was performed in this audit; APK credentials and a runnable embedded bundle were not available in the audit context.
- No 360/390/412 screenshot pass was performed, so visual overlap claims are based on shared safe-area code only.
- Expo Doctor was run through `pnpm dlx`; two warnings remain.
- Role-seed changes were not applied to a database during this audit.
- Payment confirmation was validated statically, not against a live cash-balance mutation.
- Pull-to-refresh is absent on several list screens even though retry actions exist.
- Clean checkout/EAS build must include `PaymentActionSheet.tsx`; otherwise the due detail import cannot resolve.
