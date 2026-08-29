/* eslint-disable @typescript-eslint/no-require-imports */
import Constants from "expo-constants";
import type { ImperativeRouter } from "expo-router";
import { Platform } from "react-native";

import { registerPushDevice } from "../lib/api";
import { notificationTarget } from "./target";

type NotificationsModule = typeof import("expo-notifications");
type NotificationResponse = import("expo-notifications").NotificationResponse;

let notificationsConfigured = false;

function getNotifications(): NotificationsModule | null {
  // Expo Go cannot load Android remote-notification support from SDK 53 onward.
  if (Constants.appOwnership === "expo") return null;

  try {
    const notifications = require("expo-notifications") as NotificationsModule;
    if (!notificationsConfigured) {
      notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
      notificationsConfigured = true;
    }
    return notifications;
  } catch {
    return null;
  }
}

function easProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return Constants.easConfig?.projectId ?? extra?.eas?.projectId;
}

export async function registerCurrentDeviceForPush(): Promise<void> {
  if (Platform.OS !== "android" && Platform.OS !== "ios") return;
  const Notifications = getNotifications();
  if (!Notifications) return;

  const existing = await Notifications.getPermissionsAsync();
  const permission = existing.granted ? existing : await Notifications.requestPermissionsAsync();
  if (!permission.granted) return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Notifikasi umum",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
    await Notifications.setNotificationChannelAsync("informasi-harian", {
      name: "Informasi Harian",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
      vibrationPattern: [0, 250, 200, 250],
    });
  }

  const projectId = easProjectId();
  if (!projectId) return;
  const expoPushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await registerPushDevice({ expoPushToken, platform: Platform.OS });
}

function routeFromResponse(router: ImperativeRouter, response: NotificationResponse): void {
  const target = notificationTarget(response.notification.request.content.data ?? {});
  if (target) router.push(target);
}

export function subscribeToPushEvents(router: ImperativeRouter, onChange: () => void): () => void {
  const Notifications = getNotifications();
  if (!Notifications) return () => undefined;

  const received = Notifications.addNotificationReceivedListener(onChange);
  const response = Notifications.addNotificationResponseReceivedListener((event) => {
    onChange();
    routeFromResponse(router, event);
  });
  return () => {
    received.remove();
    response.remove();
  };
}

export async function openInitialPushResponse(router: ImperativeRouter, onChange: () => void): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;

  const response = await Notifications.getLastNotificationResponseAsync();
  if (!response) return;
  onChange();
  routeFromResponse(router, response);
}
