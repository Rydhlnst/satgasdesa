# Production QA Report: SATGAS DESA SEJOLI

## Summary

- Target: https://satgas.beres.io
- QA workflow: `firecrawl-qa` with local browser execution.
- Overall status: PARTIAL — bootstrap/admin QA and core workflows passed, but role-login, R2 upload, PDF export, and production deployment-log checks remain incomplete or failed.
- Health score: 6.5/10 (manual QA heuristic; not a production monitoring metric).
- Severity counts: 2 High, 4 Medium, 0 Low.
- Health: PASS — `GET /api/health` returned `200 {"status":"ok"}`.
- Production mutations performed: temporary QA users, blocks, excavator, dues/payment, budgets, and realization records. Temporary invited users were deactivated after testing; QA records remain because no delete controls were available in the tested UI.

## Phase Results

### Phase 1 — Preflight

PASS:

- `/api/health` returns HTTP 200 and `{"status":"ok"}`.
- `/` redirects to `/login`.
- `/login`, `/forgot-password`, `/reset-password`, `/verify-email`, `/unauthorized`, and `/offline` return HTTP 200.
- Manifest, service worker, and favicon return HTTP 200 with expected content types.
- Protected dashboard routes redirect unauthenticated users to `/login`.

BLOCKED:

- Deployment commit `8bcdd3a` cannot be verified from the public site.
- Coolify deployment log messages cannot be verified without Coolify access or supplied logs.

### Phase 2 — Bootstrap Login

PASS:

- Production bootstrap login succeeded and redirected to `/dashboard`.
- Dashboard loaded with the expected sidebar, workspace tabs, account menu, and `Local Admin` identity.
- No TooltipProvider server error was observed on fresh dashboard navigation.
- Sign-out returned to `/login`; navigating to `/dashboard` after sign-out redirected back to `/login`.

### Phase 3 — QA Accounts

PARTIAL:

- Created the requested domain-based QA invitations through Settings → Users for Pimpinan, Bendahara, and Petugas Lapangan.
- Each invitation appeared as ACTIVE / Email unverified and the UI confirmed that password setup is email-based.
- The three temporary users were deactivated after testing.
- Role login could not be completed because the Resend inbox/console containing setup links was not available in the test context.

### Phase 4 — Permission QA

PARTIAL:

- Admin/Pimpinan access was verified across all listed dashboard modules and detail/creation routes; the route sweep returned HTTP 200.
- Bendahara and Petugas permission matrices remain unverified because their invitation setup links were unavailable.
- Unauthenticated protected redirects were verified; role-specific `/unauthorized` redirects remain unverified.

### Phase 5 — Operational Workflow

PARTIAL:

- Inspection creation route loaded correctly and displayed the expected empty state when no block existed.
- After creating a QA block, the inspection form became available; GPS, photo, draft/offline retry, and Petugas-role submission were not completed without the Petugas setup link.

### Phase 6 — Finance Workflow

PASS for admin/Pimpinan test path; PARTIAL for role-specific restrictions:

- Created a QA monthly due and recorded a partial payment; the due detail and payment history updated correctly.
- Created and approved QA budget periods through verify → approve.
- Created realization requests and exercised submit, verify, approve, reject, correction, and reversal actions with audit history.
- Bendahara-only entry and Pimpinan-vs-Bendahara restriction checks remain unverified.

### Phase 7 — R2 Storage QA

FAIL:

- The UI resized the selected evidence file and displayed an inline preview, but the signed R2 PUT failed at browser preflight because the R2 response omitted `Access-Control-Allow-Origin`; the UI displayed `Failed to fetch`.
- No stored object was created, so signed download, PDF opening, expiry, and unauthorized-object checks could not be completed.
- No secret access key appeared in page content; the signed URL exposed only normal presigned-request metadata.

### Phase 8 — Reports, Notifications, and Audit

PARTIAL:

- Monthly report page loaded and authenticated Excel export returned HTTP 200 with an 8,391-byte XLSX response.
- Authenticated monthly PDF export returned HTTP 500 with `{"error":"Unable to generate the report."}`.
- Notification unread badge appeared after QA activity and the notification was successfully marked as read.
- Audit log showed CREATE, EXPORT, and workflow entries for the QA activity.

### Phase 9 — Responsive and PWA QA

PASS for tested surfaces:

- Login tested at 375, 390, 430, 768, 1024, 1280, and 1440px widths.
- No horizontal overflow was detected at any tested width.
- Login email field and submit button remained visible and usable at every width.
- `/offline` renders the offline state correctly.
- `/unauthorized` renders the access-limited state and its dashboard link redirects to `/login` when unauthenticated.
- Manifest is linked, secure context is active, and a service worker is registered for `https://satgas.beres.io/`.
- Authenticated users page was also checked at 375px; mobile bottom navigation, overflow-safe stacked forms, and the “More” quick-action menu rendered correctly.

## Findings

### [H-1] Monthly PDF export returns HTTP 500

- URL: `https://satgas.beres.io/api/reports/monthly/pdf?period=2026-08`
- Severity: High
- Steps: sign in as the bootstrap Pimpinan; open `/dashboard/reports/monthly`; request the PDF export.
- Expected: a downloadable `application/pdf` response.
- Actual: HTTP 500, `{"error":"Unable to generate the report."}`. Excel export succeeds.

### [H-2] R2 evidence upload blocked by CORS

- URL: `/dashboard/realizations/e228034f-974c-4b14-87a4-889ac11f76b7`
- Severity: High
- Steps: open the QA realization, choose an evidence image, and start upload.
- Expected: the resized image uploads and the stored evidence becomes available.
- Actual: the browser preflight to the signed R2 PUT was rejected because no `Access-Control-Allow-Origin` header was returned; the UI displayed `Failed to fetch`.

### [M-1] QA finance draft submission showed a recoverable dashboard error

- URLs: `/dashboard/dues` and `/dashboard/finance/transactions`
- Severity: Medium
- Steps: submit a manual QA due or a new finance draft from the authenticated UI.
- Expected: the record is created and the list refreshes with a success state.
- Actual: the page briefly rendered `Dashboard tidak tersedia` / `Data dashboard tidak dapat dimuat`; the manual due was not found after refresh and the finance draft was not found after refresh. Monthly due generation and payment recording succeeded.

### [M-2] Cloudflare Insights blocked by CSP

- Evidence: browser console reports `https://static.cloudflareinsights.com/beacon.min.js/...` blocked by `script-src 'self' 'unsafe-inline'`.
- Impact: Cloudflare analytics does not load; core page interaction remains functional.

### [M-3] HSTS header absent

- Evidence: HTTPS `/login` response had no `Strict-Transport-Security` header.
- Impact: HTTPS hardening is incomplete. Configure HSTS at Coolify/reverse-proxy level after confirming all production subdomains support HTTPS.

### [M-4] Scheduled automation is not configured

- Evidence: unauthenticated `POST /api/jobs/daily` returns HTTP 503 with `{"error":"Scheduled automation is not configured."}`.
- Impact: daily automation cannot be verified or run in the current production configuration. Treat as expected only if cron automation is intentionally disabled.

## Public Routes and Endpoints Tested

`/`, `/login`, `/forgot-password`, `/reset-password`, `/verify-email`, `/unauthorized`, `/offline`, `/dashboard`, `/dashboard/blocks`, `/dashboard/excavators`, `/dashboard/inspections`, `/dashboard/information`, `/dashboard/dues`, `/dashboard/payments`, `/dashboard/finance`, `/dashboard/budgets`, `/dashboard/realizations`, `/dashboard/reports`, `/dashboard/notifications`, `/dashboard/audit`, `/dashboard/block-managers`, `/dashboard/settings/users`, `/api/health`, `/api/reports/monthly/csv`, `/api/jobs/daily`, `/manifest.webmanifest`, `/sw.js`, `/favicon.ico`.

Authenticated route sweep also covered `/dashboard/finance/transactions`, `/dashboard/reports/monthly`, `/dashboard/inspections/new`, `/dashboard/excavators/new`, `/dashboard/blocks/:id`, `/dashboard/excavators/:id`, `/dashboard/dues/:id`, `/dashboard/realizations/new`, `/dashboard/realizations/:id`, `/dashboard/budgets/:id`, `/dashboard/budgets/:id/edit`, and `/dashboard/settings/users`.

## Positive Observations

- Bootstrap authentication, dashboard shell, sidebar, account menu, sign-out, protected redirect, theme switching, mobile navigation, notification read action, and audit recording worked.
- Block, excavator, due, payment, budget, and realization detail pages reflected submitted data after refresh.
- Excel export returned a valid XLSX response; monthly report data loaded without inventing values.
- QA users were deactivated after the run. No application code was changed by this QA pass.

## Evidence

- Browser evidence: Playwright accessibility snapshots and console logs captured during the authenticated run.
- API evidence: `/api/health` 200; authenticated XLSX 200; authenticated PDF 500; daily job 503 when automation is disabled.
- Network/console evidence: R2 signed PUT preflight rejected for missing `Access-Control-Allow-Origin`; CSP blocked Cloudflare Insights.

## Rerun Inputs

```text
workflow: firecrawl-qa
url: https://satgas.beres.io
focus: full/forms/navigation/responsive/performance
```
