import type { ReactNode } from "react";

export type FeedbackTone = "success" | "error" | "info" | "warning";
export type FeedbackButton = { text: string; style?: "default" | "cancel" | "destructive"; onPress?: () => void };
export type FeedbackEvent =
  | { kind: "toast"; tone: FeedbackTone; title: string; message: string }
  | { kind: "confirm"; title: string; message: string; buttons: FeedbackButton[] };

export type UserFacingError = {
  title: string;
  reason: string;
  nextStep: string;
  requestId?: string;
  appRevision?: string;
  fieldErrors?: Record<string, string>;
};

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
  [/^The application database is unavailable\.?$/i, "Database aplikasi tidak tersedia."],
  [/^The storage service is not configured\.?$/i, "Penyimpanan bukti belum dikonfigurasi."],
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

function errorDetails(error: unknown) {
  if (typeof error !== "object" || error === null) return {};
  const value = error as { status?: unknown; code?: unknown; requestId?: unknown; appRevision?: unknown; fields?: unknown; userMessage?: unknown };
  const source = error instanceof Error ? error.message : "";
  const diagnostic = /\bID\s+([^\s·.]+).*?revisi server\s+([^\s.]+)\.?/i.exec(source);
  return {
    status: typeof value.status === "number" ? value.status : undefined,
    code: typeof value.code === "string" ? value.code : undefined,
    requestId: typeof value.requestId === "string" ? value.requestId : diagnostic?.[1],
    appRevision: typeof value.appRevision === "string" ? value.appRevision : diagnostic?.[2],
    fields: typeof value.fields === "object" && value.fields !== null ? value.fields as Record<string, string> : undefined,
    userMessage: typeof value.userMessage === "string" ? value.userMessage : undefined,
  };
}

function stripTechnicalDetail(message: string) {
  return message.split(/\s+Detail teknis:/i, 1)[0].trim();
}

export function describeError(error: unknown, fallback: string): UserFacingError {
  const details = errorDetails(error);
  const raw = details.userMessage || (error instanceof Error ? error.message : "") || fallback;
  const reason = localizeUserMessage(stripTechnicalDetail(raw));
  const rawStatus = details.status;
  const rawCode = details.code;
  const status = rawStatus ?? (rawCode === "UNAUTHORIZED" ? 401 : rawCode === "FORBIDDEN" ? 403 : rawCode === "NOT_FOUND" ? 404 : rawCode === "CONFLICT" ? 409 : rawCode === "VALIDATION_FAILED" ? 400 : rawCode === "SERVICE_UNAVAILABLE" ? 503 : /sesi .*berakhir|sesi .*tidak valid/i.test(reason) ? 401 : /tidak memiliki izin|akses/i.test(reason) ? 403 : /tidak ditemukan/i.test(reason) ? 404 : /data berubah|bertentangan/i.test(reason) ? 409 : /wajib|tidak valid|tidak sesuai|hanya dapat|periksa data/i.test(reason) ? 400 : /database|layanan belum siap|server gagal|tidak merespons|tidak dapat terhubung/i.test(reason) ? 503 : undefined);
  const code = rawCode;
  const title = status === 401 || code === "UNAUTHORIZED"
    ? "Sesi berakhir"
    : status === 403 || code === "FORBIDDEN"
      ? "Akses tidak tersedia"
      : status === 404 || code === "NOT_FOUND"
        ? "Data tidak ditemukan"
        : status === 409 || code === "CONFLICT"
          ? "Data berubah"
          : status === 400 || code === "VALIDATION_FAILED"
            ? "Periksa data"
          : status === 503 || code === "SERVICE_UNAVAILABLE"
            ? "Layanan belum siap"
            : "Terjadi masalah";
  const nextStep = status === 401 || code === "UNAUTHORIZED"
    ? "Masuk kembali untuk melanjutkan."
    : status === 403 || code === "FORBIDDEN"
      ? "Hubungi pengelola jika Anda membutuhkan akses ini."
      : status === 404 || code === "NOT_FOUND"
        ? "Muat ulang data dan pastikan deployment server sudah terbaru."
        : status === 409 || code === "CONFLICT"
          ? "Muat ulang data terbaru, lalu ulangi tindakan."
          : status === 400 || code === "VALIDATION_FAILED"
            ? "Periksa data yang ditandai lalu coba lagi."
            : "Periksa koneksi dan status layanan, lalu coba lagi.";
  return { title, reason, nextStep, requestId: details.requestId, appRevision: details.appRevision, fieldErrors: details.fields };
}

export function isRetryableNetworkError(error: unknown) {
  if (typeof error === "object" && error !== null && "status" in error && typeof error.status === "number") return false;
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /network|fetch|connection|koneksi|timeout|terhubung|internet|offline/i.test(message);
}

export function showActionError(error: unknown, fallback = "Periksa data dan koneksi lalu coba lagi.") {
  const details = describeError(error, fallback);
  const diagnostic = details.requestId ? ` ID dukungan: ${details.requestId}.` : "";
  emit({ kind: "toast", tone: "error", title: details.title === "Terjadi masalah" ? "Aksi gagal" : details.title, message: `${details.reason} ${details.nextStep}${diagnostic}` });
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
      if (tone === "error") {
        const details = describeError(new Error(localizedMessage), localizedMessage);
        const diagnostic = details.requestId ? ` ID dukungan: ${details.requestId}.` : "";
        emit({ kind: "toast", tone, title: details.title === "Terjadi masalah" ? localizedTitle : details.title, message: `${details.reason} ${details.nextStep}${diagnostic}` });
      } else emit({ kind: "toast", tone, title: localizedTitle, message: localizedMessage });
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
