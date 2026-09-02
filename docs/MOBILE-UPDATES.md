# Mobile OTA Updates

The production APK uses EAS Update on the `default` channel with runtime version `0.1.0`. The app checks for a compatible update at startup and when returning to the foreground, downloads it, and reloads automatically.

Publish JavaScript/UI changes from the `mobile` directory:

```powershell
npm exec --yes eas-cli@latest -- update --channel default --environment production --platform android --message "Ringkasan perubahan"
```

The `production` EAS environment must contain the same `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_MAPTILER_API_KEY` values used by the production APK. Do not publish an update using local emulator values such as `http://10.0.2.2:3000`.

OTA updates cover JavaScript, screens, styling, validation, API calls, and assets. Create a new APK when changing native dependencies, permissions, MapLibre, camera/GPS configuration, Expo SDK, or the runtime version.

Every native build that should receive these updates must use the `default` channel. The current profiles preserve that channel so existing APKs remain compatible.
