export const BLOCK_ASSIGNMENT_ROLES = ["MANAGER", "LOCATION_PIC", "FIELD_PIC"] as const;

export type BlockAssignmentRole = (typeof BLOCK_ASSIGNMENT_ROLES)[number];
