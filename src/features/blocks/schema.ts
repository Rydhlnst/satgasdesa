import { z } from "zod";

export const BLOCK_STATUSES = ["ACTIVE", "STOPPED", "NOT_OPERATING"] as const;
export const blockIdSchema = z.string().uuid("Invalid block ID.");

export const blockFormSchema = z.object({
  code: z.string().trim().min(1, "Block code is required.").max(32),
  name: z.string().trim().min(1, "Block name is required.").max(160),
  status: z.enum(BLOCK_STATUSES),
  latitude: z.coerce.number().finite().min(-90).max(90),
  longitude: z.coerce.number().finite().min(-180).max(180),
  locationPhotoKey: z.string().trim().max(255).optional(),
  managerName: z.string().trim().max(160).optional(),
  locationPicName: z.string().trim().max(160).optional(),
  fieldPicName: z.string().trim().max(160).optional(),
  contact: z.string().trim().max(64).optional(),
  workerCount: z.coerce.number().int().min(0).max(100000),
  operationalCondition: z.string().trim().min(1, "Operational condition is required.").max(5000),
  startDate: z.string().trim().max(10).optional(),
  notes: z.string().trim().max(5000).optional(),
});

export type BlockFormValues = z.infer<typeof blockFormSchema>;
