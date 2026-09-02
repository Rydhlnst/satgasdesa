import { Stack, useRouter } from "expo-router";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useEffect, useState } from "react";

import { AuthProvider } from "../src/auth";
import { DateRangeProvider } from "../src/date-range-provider";
import { openInitialPushResponse, subscribeToPushEvents } from "../src/notifications/push";
import { OfflineSyncProvider } from "../src/offline/provider";
import { GluestackUIProvider } from "../src/components/ui/gluestack-ui-provider";
import { AppErrorBoundary } from "../src/components/AppErrorBoundary";
import { AutoUpdate } from "../src/components/AutoUpdate";
import "../global.css";

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
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: false } } }));
  return <SafeAreaProvider><QueryClientProvider client={queryClient}><DateRangeProvider><AuthProvider><OfflineSyncProvider><GluestackUIProvider mode="light"><AppErrorBoundary><AutoUpdate /><PushNotificationRouter /><StatusBar style="dark" /><Stack screenOptions={{ headerShown: false }} /></AppErrorBoundary></GluestackUIProvider></OfflineSyncProvider></AuthProvider></DateRangeProvider></QueryClientProvider></SafeAreaProvider>;
}
