# Mobile UI Architecture

## Foundation

Reusable controls use the generated Gluestack UI v5 primitives in `src/components/ui`. Product code imports them through `src/components/AppPrimitives.tsx` or a semantic component in `src/components`.

The existing Gluestack provider, Uniwind configuration, SATGAS tokens, route names, permissions, API contracts, and business transitions are retained.

## Approved native exceptions

React Native platform components remain appropriate for:

- `FlatList`, `ScrollView`, `RefreshControl`, and keyboard-aware layout.
- Safe-area and platform lifecycle APIs.
- `Image` and native image/link presentation.
- MapLibre, camera/gallery, GPS, notifications, and other native capabilities.
- Pressable list-row composition when it is wrapped by a semantic row component.
- Animation and gesture implementation inside generated or shared primitives.

These exceptions are infrastructure, not a second visual system. New buttons, fields, dialogs, sheets, status controls, and repeated list patterns must use a Gluestack-backed semantic wrapper.

## Layout contract

`Screen` resolves bottom-navigation space from the route or explicit `withBottomNav`. New screens with an absolute `BottomNav` must pass `withBottomNav` when route inference cannot identify the destination. Primary actions belong inside the empty state or after the populated list and must remain above the shared inset and Android gesture area.

## Interaction contract

- Icon-only actions use `IconButton` and an explicit accessibility label.
- Primary, approval, destructive, and ambiguous actions use icon plus visible text.
- Touch targets are at least 44x44.
- Async mutations expose disabled/loading state and invalidate affected queries after success.
- Date, media, confirmation, and payment surfaces use the shared sheet/modal patterns.
