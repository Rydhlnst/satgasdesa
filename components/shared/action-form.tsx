import type { ComponentProps, ReactNode } from "react";

export type FormServerAction = (formData: FormData) => void | Promise<void>;

type ActionFormProps = Omit<ComponentProps<"form">, "action"> & {
  action: FormServerAction;
  children: ReactNode;
};

export function ActionForm({ action, children, ...props }: ActionFormProps) {
  return <form {...props} action={action}>{children}</form>;
}

export function getActionErrorMessage(error: unknown): string {
  const raw = typeof error === "string" ? error : error instanceof Error ? error.message : "";
  const message = raw.trim().toLowerCase();
  if (message.includes("unauthorized") || message.includes("permission") || message.includes("izin")) return "Anda tidak memiliki izin untuk melakukan tindakan ini.";
  if (message.includes("not found") || message.includes("tidak ditemukan")) return "Data yang diminta tidak ditemukan.";
  if (message.includes("already") || message.includes("immutable") || message.includes("sudah")) return "Data ini sudah diproses dan tidak dapat diubah dengan tindakan tersebut.";
  if (message.includes("required") || message.includes("invalid") || message.includes("check") || message.includes("periksa")) return "Periksa kembali data yang diisi lalu coba lagi.";
  if (message.includes("network") || message.includes("offline") || message.includes("koneksi")) return "Koneksi sedang bermasalah. Coba lagi saat jaringan tersedia.";
  return "Terjadi kesalahan. Coba lagi.";
}
