export const EXCAVATOR_STATUSES = ["ACTIVE", "INACTIVE", "EXITED"] as const;
export const EXCAVATOR_MOVEMENT_TYPES = ["ENTRY", "TRANSFER", "EXIT"] as const;

export type ExcavatorStatus = (typeof EXCAVATOR_STATUSES)[number];
export type ExcavatorMovementType = (typeof EXCAVATOR_MOVEMENT_TYPES)[number];
