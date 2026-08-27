import type { ReactNode } from "react";

export type FeedbackTone = "success" | "error" | "info" | "warning";
export type FeedbackButton = { text: string; style?: "default" | "cancel" | "destructive"; onPress?: () => void };
export type FeedbackEvent =
  | { kind: "toast"; tone: FeedbackTone; title: string; message: string }
  | { kind: "confirm"; title: string; message: string; buttons: FeedbackButton[] };

const listeners = new Set<(event: FeedbackEvent) => void>();

export function subscribeFeedback(listener: (event: FeedbackEvent) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(event: FeedbackEvent) {
  listeners.forEach((listener) => listener(event));
}

function messageFor(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

export function isRetryableNetworkError(error: unknown) {
  if (typeof error === "object" && error !== null && "status" in error && typeof error.status === "number") return false;
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /network|fetch|connection|koneksi|timeout|terhubung|internet|offline/i.test(message);
}

export function showActionError(error: unknown, fallback = "Periksa data dan koneksi lalu coba lagi.") {
  emit({ kind: "toast", tone: "error", title: "Aksi gagal", message: messageFor(error, fallback) });
}

export function showActionSuccess(message: string, title = "Berhasil") {
  emit({ kind: "toast", tone: "success", title, message });
}

export function showActionInfo(message: string, title = "Informasi") {
  emit({ kind: "toast", tone: "info", title, message });
}

export const AppAlert = {
  alert(title: string, message: string, buttons?: FeedbackButton[], _options?: { cancelable?: boolean }) {
    void _options;
    if (!buttons?.length) {
      const tone: FeedbackTone = /gagal|tidak dapat|error|invalid|tidak tersedia|unable|failed|periksa|wajib|diperlukan|permission|izin|required/i.test(title) ? "error" : "success";
      emit({ kind: "toast", tone, title, message });
      return;
    }
    const hasConfirmation = buttons.length > 1 || buttons.some((button) => button.style === "destructive" || button.style === "cancel" || /batal|cancel|hapus|delete/i.test(button.text));
    if (hasConfirmation) {
      emit({ kind: "confirm", title, message, buttons });
      return;
    }
    emit({ kind: "toast", tone: "success", title, message });
    buttons[0]?.onPress?.();
  },
};

export type FeedbackHostProps = { children?: ReactNode };
