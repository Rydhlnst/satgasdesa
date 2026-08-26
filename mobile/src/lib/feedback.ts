import { Alert, Platform, ToastAndroid } from "react-native";

function messageFor(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

export function isRetryableNetworkError(error: unknown) {
  if (typeof error === "object" && error !== null && "status" in error && typeof error.status === "number") return false;
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /network|fetch|connection|koneksi|timeout|terhubung|internet|offline/i.test(message);
}

function show(title: string, message: string) {
  if (Platform.OS === "android") {
    ToastAndroid.showWithGravity(`${title}: ${message}`, ToastAndroid.LONG, ToastAndroid.BOTTOM);
    return;
  }
  Alert.alert(title, message);
}

export function showActionError(error: unknown, fallback = "Periksa data dan koneksi lalu coba lagi.") {
  show("Aksi gagal", messageFor(error, fallback));
}

export function showActionSuccess(message: string, title = "Berhasil") {
  show(title, message);
}
