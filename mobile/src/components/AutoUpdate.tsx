import { AppState, type AppStateStatus } from "react-native";
import { useCallback, useEffect, useRef } from "react";
import * as Updates from "expo-updates";

const CHECK_INTERVAL_MS = 15 * 60 * 1000;

/**
 * Checks for an EAS Update when the app starts and when it returns to the
 * foreground. The update is downloaded and applied immediately so users do
 * not need to reinstall the APK for JavaScript/UI releases.
 */
export function AutoUpdate() {
  const checking = useRef(false);
  const lastCheckAt = useRef(0);

  const checkForUpdate = useCallback(async () => {
    if (__DEV__ || !Updates.isEnabled || checking.current || Date.now() - lastCheckAt.current < CHECK_INTERVAL_MS) return;

    checking.current = true;
    lastCheckAt.current = Date.now();
    try {
      const result = await Updates.checkForUpdateAsync();
      if (!result.isAvailable) return;

      const downloaded = await Updates.fetchUpdateAsync();
      if (downloaded.isNew) await Updates.reloadAsync();
    } catch (error) {
      // Background update failures must not block login or normal app use.
      if (__DEV__) console.warn("EAS Update check failed", error);
    } finally {
      checking.current = false;
    }
  }, []);

  useEffect(() => {
    void checkForUpdate();

    const handleAppState = (state: AppStateStatus) => {
      if (state === "active") void checkForUpdate();
    };
    const subscription = AppState.addEventListener("change", handleAppState);
    return () => subscription.remove();
  }, [checkForUpdate]);

  return null;
}
