export const INITIAL_BUDGET_GROUPS = [
  "Pemeliharaan/Pembangunan Infrastruktur Desa",
  "Belanja untuk Kegiatan Sosial dan Kegiatan Rutin Bulanan",
  "Operasional Pengurus",
] as const;

export const BUDGET_PERIOD_STATUSES = ["DRAFT", "VERIFIED", "APPROVED"] as const;

export const REALIZATION_TRANSITIONS = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["VERIFIED", "REJECTED"],
  VERIFIED: ["SAH", "REJECTED"],
  SAH: [],
  REJECTED: [],
} as const;
