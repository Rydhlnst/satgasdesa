export const INITIAL_BUDGET_GROUPS = [
  "Pemeliharaan/Pembangunan Infrastruktur Desa",
  "Belanja untuk Kegiatan Sosial dan Kegiatan Rutin Bulanan",
  "Operasional Pengurus",
] as const;

export const BUDGET_PERIOD_STATUSES = ["DRAFT", "VERIFIED", "APPROVED"] as const;

export const BUDGET_CHANGE_REQUEST_STATUSES = ["DRAFT", "SUBMITTED", "VERIFIED", "APPROVED", "REJECTED", "CANCELLED"] as const;

export const REALIZATION_TRANSITIONS = {
  DRAFT: ["SUBMITTED", "CANCELLED"],
  SUBMITTED: ["VERIFIED", "REVISION_REQUIRED", "REJECTED"],
  VERIFIED: ["SAH", "REVISION_REQUIRED", "REJECTED"],
  REVISION_REQUIRED: ["SUBMITTED", "CANCELLED"],
  SAH: [],
  REJECTED: [],
  CANCELLED: [],
  REVERSED: [],
} as const;
