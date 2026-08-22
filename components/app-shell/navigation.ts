import { PERMISSIONS, type Permission } from "@/src/lib/permissions/constants";

export type NavIconName = "dashboard" | "blocks" | "excavators" | "inspections" | "information" | "dues" | "finance" | "budgets" | "realizations" | "reports" | "notifications" | "audit" | "managers" | "settings";

export type AppNavItem = {
  label: string;
  href: string;
  icon: NavIconName;
  permission?: Permission;
};

export type AccessRole = "PIMPINAN" | "BENDAHARA" | "PETUGAS_LAPANGAN";

export function accessRoleLabel(role: AccessRole): string {
  if (role === "PIMPINAN") return "PIMPINAN / ADMIN";
  if (role === "BENDAHARA") return "BENDAHARA";
  return "PETUGAS LAPANGAN";
}

export function getAccessRole(items: AppNavItem[]): AccessRole {
  if (items.some((item) => item.href === "/dashboard/settings/users")) return "PIMPINAN";
  if (items.some((item) => item.href === "/dashboard/finance")) return "BENDAHARA";
  return "PETUGAS_LAPANGAN";
}

export const APP_NAV_ITEMS: AppNavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { label: "Monitoring Blok", href: "/dashboard/blocks", icon: "blocks", permission: PERMISSIONS.BLOCK_READ },
  { label: "Excavator", href: "/dashboard/excavators", icon: "excavators", permission: PERMISSIONS.EXCAVATOR_READ },
  { label: "Inspeksi Lapangan", href: "/dashboard/inspections", icon: "inspections", permission: PERMISSIONS.INSPECTION_READ },
  { label: "Informasi Harian", href: "/dashboard/information", icon: "information", permission: PERMISSIONS.DAILY_INFO_READ },
  { label: "Iuran & Pembayaran", href: "/dashboard/dues", icon: "dues", permission: PERMISSIONS.DUES_READ },
  { label: "Keuangan", href: "/dashboard/finance", icon: "finance", permission: PERMISSIONS.FINANCE_READ },
  { label: "Anggaran", href: "/dashboard/budgets", icon: "budgets", permission: PERMISSIONS.BUDGET_READ },
  { label: "Realisasi", href: "/dashboard/realizations", icon: "realizations", permission: PERMISSIONS.REALIZATION_READ },
  { label: "Laporan", href: "/dashboard/reports", icon: "reports", permission: PERMISSIONS.REPORT_READ },
  { label: "Notifikasi", href: "/dashboard/notifications", icon: "notifications" },
  { label: "Audit Log", href: "/dashboard/audit", icon: "audit", permission: PERMISSIONS.AUDIT_READ },
  { label: "Pengelola Blok", href: "/dashboard/block-managers", icon: "managers", permission: PERMISSIONS.BLOCK_READ },
  { label: "Pengguna", href: "/dashboard/settings/users", icon: "settings", permission: PERMISSIONS.USER_READ },
];
