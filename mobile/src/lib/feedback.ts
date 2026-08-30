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

const messageTranslations: Array<[RegExp, string]> = [
  [/^OK$/i, "Tutup"],
  [/^Payment exceeds the outstanding balance\.?$/i, "Jumlah pembayaran melebihi sisa tagihan."],
  [/^Confirmed and pending payments cannot exceed the due amount\.?$/i, "Total pembayaran yang sudah dikonfirmasi dan masih menunggu tidak boleh melebihi jumlah tagihan."],
  [/^This due has already been fully paid\.?$/i, "Iuran ini sudah lunas."],
  [/^Due payment balance is inconsistent and requires reconciliation\.?$/i, "Saldo pembayaran iuran tidak konsisten dan perlu diperbaiki."],
  [/^Only pending payments can be confirmed\.?$/i, "Hanya pembayaran yang masih menunggu yang dapat dikonfirmasi."],
  [/^Only pending payments can be rejected\.?$/i, "Hanya pembayaran yang masih menunggu yang dapat ditolak."],
  [/^Only confirmed payments can be reversed\.?$/i, "Hanya pembayaran yang sudah dikonfirmasi yang dapat dibatalkan."],
  [/^Only approved payment transactions can be reversed\.?$/i, "Hanya transaksi pembayaran yang sudah disahkan yang dapat dibatalkan."],
  [/^This due changed before confirmation\. Refresh and try again\.?$/i, "Data iuran berubah sebelum konfirmasi. Muat ulang lalu coba lagi."],
  [/^This due changed before the reversal could be applied\.?$/i, "Data iuran berubah sebelum pembatalan diterapkan. Muat ulang lalu coba lagi."],
  [/^Due payment was not found\.?$/i, "Pembayaran iuran tidak ditemukan."],
  [/^Due was not found\.?$/i, "Iuran tidak ditemukan."],
  [/^Payment cash transaction was not found\.?$/i, "Transaksi kas pembayaran tidak ditemukan."],
  [/^Reversal reason is required\.?$/i, "Alasan pembatalan wajib diisi."],
  [/^A rejection reason is required\.?$/i, "Alasan penolakan wajib diisi."],
  [/^Monthly payments can only be recorded from day 1 through day 10 of the month\.?$/i, "Pembayaran bulanan hanya dapat dicatat dari tanggal 1 sampai 10 setiap bulan."],
  [/^Invalid ID\.?$/i, "ID tidak valid."],
  [/^Payer is required\.?$/i, "Nama pembayar wajib diisi."],
  [/^The request conflicts with current data\.?$/i, "Permintaan bertentangan dengan data terbaru."],
  [/^Invalid request data\.?$/i, "Data permintaan tidak valid."],
  [/^Your session is invalid or expired\.?$/i, "Sesi Anda tidak valid atau sudah berakhir."],
  [/^You do not have permission to perform this action\.?$/i, "Anda tidak memiliki izin untuk melakukan tindakan ini."],
  [/^Unable to load the requested data\.?$/i, "Data yang diminta tidak dapat dimuat."],
  [/^The requested API route or resource was not found\.?$/i, "Rute API atau data yang diminta tidak ditemukan."],
  [/^The request could not be processed\.?$/i, "Permintaan tidak dapat diproses."],
  [/^Too many requests\. Try again later\.?$/i, "Terlalu banyak permintaan. Coba lagi nanti."],
  [/^The server failed to process the request\.?$/i, "Server gagal memproses permintaan."],
  [/^The service is not ready\.?$/i, "Layanan belum siap."],
];

export function localizeUserMessage(message: string) {
  const localized = message.trim();
  for (const [pattern, replacement] of messageTranslations) {
    if (pattern.test(localized)) return replacement;
  }
  if (/^Unable to\b|^Failed to\b|^Request failed\b/i.test(localized)) return "Permintaan tidak dapat diproses.";
  if (/^Invalid\b/i.test(localized)) return "Data tidak valid.";
  if (/^Only\b/i.test(localized)) return "Tindakan ini tidak dapat dilakukan pada data tersebut.";
  if (/\b(required|must be supplied|must be provided)\b/i.test(localized)) return "Data wajib diisi atau dilengkapi.";
  if (/\b(cannot|can't|must be|can only|outside|unsupported|not configured|not available)\b/i.test(localized)) return "Data tidak memenuhi aturan proses.";
  if (/\bnot found\b/i.test(localized)) return "Data yang diminta tidak ditemukan.";
  if (/\balready exists\b/i.test(localized)) return "Data tersebut sudah ada.";
  if (/\balready used\b/i.test(localized)) return "Data tersebut sudah pernah digunakan.";
  if (/\bexceeds\b/i.test(localized)) return "Nilai melebihi batas yang diizinkan.";
  return localized;
}

export function errorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error && error.message.trim() ? error.message : fallback;
  return localizeUserMessage(message);
}

export function isRetryableNetworkError(error: unknown) {
  if (typeof error === "object" && error !== null && "status" in error && typeof error.status === "number") return false;
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /network|fetch|connection|koneksi|timeout|terhubung|internet|offline/i.test(message);
}

export function showActionError(error: unknown, fallback = "Periksa data dan koneksi lalu coba lagi.") {
  emit({ kind: "toast", tone: "error", title: "Aksi gagal", message: errorMessage(error, fallback) });
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
    const localizedTitle = localizeUserMessage(title);
    const localizedMessage = localizeUserMessage(message);
    const localizedButtons = buttons?.map((button) => ({ ...button, text: localizeUserMessage(button.text) }));
    if (!buttons?.length) {
      const tone: FeedbackTone = /gagal|tidak dapat|error|invalid|tidak tersedia|periksa|wajib|diperlukan|izin|tidak valid/i.test(`${localizedTitle} ${localizedMessage}`) ? "error" : "success";
      emit({ kind: "toast", tone, title: localizedTitle, message: localizedMessage });
      return;
    }
    const hasConfirmation = localizedButtons!.length > 1 || localizedButtons!.some((button) => button.style === "destructive" || button.style === "cancel" || /batal|hapus/i.test(button.text));
    if (hasConfirmation) {
      emit({ kind: "confirm", title: localizedTitle, message: localizedMessage, buttons: localizedButtons! });
      return;
    }
    emit({ kind: "toast", tone: "success", title: localizedTitle, message: localizedMessage });
    localizedButtons?.[0]?.onPress?.();
  },
};

export type FeedbackHostProps = { children?: ReactNode };
