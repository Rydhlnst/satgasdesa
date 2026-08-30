import type { AccessRole } from "@/components/app-shell/navigation";

export const MOBILE_SURFACE = {
  page: "bg-[#f7f8fa]",
  card: "rounded-2xl border border-[#dfe4ec] bg-white shadow-[0_14px_34px_-26px_rgba(15,35,75,0.65)]",
  cardFinance: "rounded-2xl border border-[#dcebe2] bg-white shadow-[0_14px_34px_-26px_rgba(15,92,53,0.55)]",
  cardPadded: "rounded-2xl border border-[#dfe4ec] bg-white p-3.5 shadow-[0_14px_34px_-26px_rgba(15,35,75,0.65)]",
  cardFinancePadded: "rounded-2xl border border-[#dcebe2] bg-white p-3.5 shadow-[0_14px_34px_-26px_rgba(15,92,53,0.55)]",
  field: "rounded-xl border border-[#dfe4ec] bg-white px-3 py-2.5 shadow-[0_8px_20px_-18px_rgba(15,35,75,0.8)]",
  mutedField: "rounded-xl border border-[#dfe4ec] bg-[#f8fafc] px-3 py-2.5",
  divider: "border-[#edf0f4]",
  tabs: "flex items-center gap-5 border-b border-[#dfe4ec] pb-2 text-[10px] font-semibold text-[#7b8491]",
  primaryAction: "h-10 w-full rounded-lg bg-[#1454c4] text-xs font-bold text-white",
  financeAction: "h-10 w-full rounded-lg bg-[#16834a] text-xs font-bold text-white",
  secondaryAction: "h-10 rounded-lg border-[#b5c4e2] bg-white text-[10px] text-[#173a7d]",
  statusSuccess: "bg-[#e8f6ec] text-[#166b40]",
  statusInfo: "bg-[#edf2ff] text-[#1454c4]",
  statusDanger: "bg-[#ffe9e7] text-[#c5312c]",
  statusWarning: "bg-[#fff2da] text-[#8f5a0a]",
  mutedText: "text-[#626d7c]",
} as const;

export const MOBILE_ROLE_TOKENS: Record<AccessRole, { header: string; accent: string; accentSoft: string; heading: string; page: string }> = {
  PIMPINAN: {
    header: "bg-[#123c9c]",
    accent: "text-[#1454c4]",
    accentSoft: "bg-[#edf2ff] text-[#1454c4]",
    heading: "text-[#142d60]",
    page: MOBILE_SURFACE.page,
  },
  BENDAHARA: {
    header: "bg-[#137b4b]",
    accent: "text-[#16834a]",
    accentSoft: "bg-[#e8f6ec] text-[#166b40]",
    heading: "text-[#143f2d]",
    page: MOBILE_SURFACE.page,
  },
  PETUGAS_LAPANGAN: {
    header: "bg-[#123c9c]",
    accent: "text-[#1454c4]",
    accentSoft: "bg-[#edf2ff] text-[#1454c4]",
    heading: "text-[#142d60]",
    page: MOBILE_SURFACE.page,
  },
};

export function mobileRoleTokens(role: AccessRole) {
  return MOBILE_ROLE_TOKENS[role];
}
