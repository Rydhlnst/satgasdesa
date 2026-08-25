import NetInfo from "@react-native-community/netinfo";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";
import { AppState } from "react-native";

import { useAuth } from "../auth";
import { registerCurrentDeviceForPush } from "../notifications/push";
import { getNextOutboxRetryAt, getOutboxSummary, initializeOfflineStore, type OutboxSummary } from "./store";
import { syncOutbox } from "./sync";

type OfflineSyncContextValue = {
  isOnline: boolean;
  isSyncing: boolean;
  summary: OutboxSummary;
  syncNow: (force?: boolean) => Promise<void>;
};

const OfflineSyncContext = createContext<OfflineSyncContextValue | null>(null);
const emptySummary: OutboxSummary = { PENDING: 0, SYNCING: 0, SYNCED: 0, FAILED: 0 };

export function OfflineSyncProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const { session, loading: isAuthLoading } = useAuth();
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [summary, setSummary] = useState<OutboxSummary>(emptySummary);
  const [nextRetryAt, setNextRetryAt] = useState<number | null>(null);
  const syncingRef = useRef(false);

  const refreshSummary = useCallback(async () => {
    const [nextSummary, retryAt] = await Promise.all([getOutboxSummary(), getNextOutboxRetryAt()]);
    setSummary(nextSummary);
    setNextRetryAt(retryAt);
  }, []);
  const syncNow = useCallback(async (force = false) => {
    if (!session || syncingRef.current) return;
    syncingRef.current = true;
    setIsSyncing(true);
    try {
      const result = await syncOutbox(force);
      if (result.synced) await queryClient.invalidateQueries();
    } finally {
      await refreshSummary();
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, [queryClient, refreshSummary, session]);

  useEffect(() => {
    void initializeOfflineStore().then(refreshSummary);
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = Boolean(state.isConnected) && state.isInternetReachable !== false;
      setIsOnline(online);
      if (!isAuthLoading && session && online) void syncNow();
    });
    return unsubscribe;
  }, [isAuthLoading, refreshSummary, session, syncNow]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && session && isOnline) void syncNow();
    });
    return () => subscription.remove();
  }, [isOnline, session, syncNow]);

  useEffect(() => {
    if (!session || !isOnline || !nextRetryAt) return;
    const timer = setTimeout(() => void syncNow(), Math.max(0, nextRetryAt - Date.now()));
    return () => clearTimeout(timer);
  }, [isOnline, nextRetryAt, session, syncNow]);

  useEffect(() => {
    if (session) void registerCurrentDeviceForPush().catch(() => undefined);
  }, [session]);

  const value = useMemo(() => ({ isOnline, isSyncing, summary, syncNow }), [isOnline, isSyncing, summary, syncNow]);
  return <OfflineSyncContext.Provider value={value}>{children}</OfflineSyncContext.Provider>;
}

export function useOfflineSync(): OfflineSyncContextValue {
  const value = useContext(OfflineSyncContext);
  if (!value) throw new Error("useOfflineSync must be used within OfflineSyncProvider");
  return value;
}
