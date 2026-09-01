# QA Plan

## Scope

Expo mobile app using Expo Router, TanStack Query, Better Auth, the workflow API, offline SQLite queueing, and MapLibre/MapTiler.

## Required phases

1. Discovery: routes, roles, permissions, actions, API handlers, states, and native capabilities.
2. Static validation: typecheck, lint, unit tests, Expo Doctor, clean-build dependency review.
3. Staging execution: login per role, read-only navigation, then controlled mutation flows.
4. Device visual validation: 360, 390, and 412 widths; keyboard, safe area, empty state, and action placement.
5. Triage and release report.

## Release gates

- Mobile typecheck, root tests, and lint pass.
- All deployed role permissions match canonical policy.
- Payment confirmation updates the cash balance exactly once.
- Field evidence and GPS flows complete on a staging device.
- No primary action is obscured by bottom navigation.
- EAS APK contains the JS bundle and runs without Metro.
