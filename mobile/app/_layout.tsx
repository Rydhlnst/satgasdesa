import { Stack, useRouter } from "expo-router";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";

import { AuthProvider } from "../src/auth";
import { DateRangeProvider } from "../src/date-range-provider";
import { openInitialPushResponse, subscribeToPushEvents } from "../src/notifications/push";
import { OfflineSyncProvider } from "../src/offline/provider";

function PushNotificationRouter() {
  const router = useRouter();
  const queryClient = useQueryClient();
  useEffect(() => {
    const refresh = () => void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    void openInitialPushResponse(router, refresh);
    return subscribeToPushEvents(router, refresh);
  }, [queryClient, router]);
  return null;
}

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } }));
  return <QueryClientProvider client={queryClient}><DateRangeProvider><AuthProvider><OfflineSyncProvider><PushNotificationRouter /><StatusBar style="light" /><Stack screenOptions={{ headerShown: false }} /></OfflineSyncProvider></AuthProvider></DateRangeProvider></QueryClientProvider>;
}
