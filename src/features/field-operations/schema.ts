import { z } from "zod";

import { calendarDate } from "@/src/lib/date-range";

const uuid = z.string().uuid("Invalid ID.");
export const businessActorSchema = z.object({
  actorType: z.enum(["INDIVIDUAL", "COMPANY"]),
  name: z.string().trim().min(1, "Business actor name is required.").max(160),
  representativeName: z.string().trim().max(160).optional(),
  contact: z.string().trim().max(64).optional(),
  address: z.string().trim().max(5000).optional(),
  notes: z.string().trim().max(5000).optional(),
});
export const updateBusinessActorSchema = businessActorSchema.extend({ id: uuid });

export const businessActorFiltersSchema = z.object({
  query: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export const fieldAssignmentSchema = z.object({
  blockId: uuid,
  fieldOfficerId: uuid,
  startedAt: calendarDate(),
  endedAt: calendarDate().optional(),
  notes: z.string().trim().max(5000).optional(),
}).superRefine((value, context) => {
  if (value.endedAt && value.endedAt < value.startedAt) context.addIssue({ code: "custom", path: ["endedAt"], message: "End date must not be before start date." });
});
export const endFieldAssignmentSchema = z.object({ id: uuid, endedAt: calendarDate(), notes: z.string().trim().max(5000).optional() });

export const paymentVerificationSchema = z.object({
  duePaymentId: uuid,
  verificationStatus: z.enum(["CONFIRMED", "DISCREPANCY"]),
  verifiedAt: z.coerce.date().optional(),
  latitude: z.coerce.number().finite().min(-90).max(90).optional(),
  longitude: z.coerce.number().finite().min(-180).max(180).optional(),
  gpsAccuracy: z.coerce.number().finite().min(0).max(100000).optional(),
  evidenceKey: z.string().trim().max(255).optional(),
  notes: z.string().trim().max(5000).optional(),
}).superRefine((value, context) => {
  const hasCoordinates = value.latitude !== undefined || value.longitude !== undefined || value.gpsAccuracy !== undefined;
  if (hasCoordinates && (value.latitude === undefined || value.longitude === undefined || value.gpsAccuracy === undefined)) {
    context.addIssue({ code: "custom", path: ["latitude"], message: "Latitude, longitude, and GPS accuracy must be supplied together." });
  }
  if (value.verificationStatus === "DISCREPANCY" && !value.notes?.trim()) context.addIssue({ code: "custom", path: ["notes"], message: "A discrepancy requires a field note." });
});

export const paymentVerificationUploadSchema = z.object({
  duePaymentId: uuid,
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  size: z.coerce.number().int().positive().max(10 * 1024 * 1024),
  originalName: z.string().trim().min(1).max(255),
});
