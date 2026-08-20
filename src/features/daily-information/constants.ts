export const DAILY_INFORMATION_CATEGORIES = ["COMPLAINT", "INCIDENT", "PROSPECTIVE_MANAGER", "NOTICE"] as const;
export const DAILY_INFORMATION_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export const DAILY_INFORMATION_STATUSES = ["NEW", "RECEIVED", "IN_PROGRESS", "COMPLETED", "CLOSED"] as const;

export type DailyInformationStatus = (typeof DAILY_INFORMATION_STATUSES)[number];

export const DAILY_INFORMATION_TRANSITIONS: Record<DailyInformationStatus, readonly DailyInformationStatus[]> = {
  NEW: ["RECEIVED"],
  RECEIVED: ["IN_PROGRESS"],
  IN_PROGRESS: ["COMPLETED", "CLOSED"],
  COMPLETED: [],
  CLOSED: [],
};
