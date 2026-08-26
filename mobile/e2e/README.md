# Mobile E2E tests

These Maestro flows target the installed Android APK and use read-only journeys.
They do not create, edit, upload, approve, or delete production records.

## Prerequisites

- Android emulator `Pixel_7a` is running and authorized with ADB.
- The APK is built from the `mobile` directory so the production JavaScript bundle is embedded.
- Maestro CLI and Java 17+ are installed.
- Test credentials are provided through environment variables.

## Run

```powershell
$env:TEST_EMAIL = "..."
$env:TEST_PASSWORD = "..."
$env:PIMPINAN_EMAIL = "..."
$env:PIMPINAN_PASSWORD = "..."
$env:FIELD_EMAIL = "..."
$env:FIELD_PASSWORD = "..."

maestro test `
  --format junit `
  --output mobile\e2e\results\report.xml `
  --test-output-dir mobile\e2e\results\artifacts `
  mobile\e2e\maestro
```

The current downloaded APK is not runnable: it was built without an embedded JS bundle and tries to connect to Metro at `10.0.2.2:8081`. Rebuild it from `mobile` before running these flows.
