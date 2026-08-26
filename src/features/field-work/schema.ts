import { z } from "zod";

import { calendarDate } from "@/src/lib/date-range";

const uuid = z.string().uuid("Invalid ID.");
const date = calendarDate();
const dateRangeFields = { dateFrom: date.optional(), dateTo: date.optional() };

export const FIELD_TASK_STATUSES = ["TODO", "IN_PROGRESS", "DONE", "CANCELLED"] as const;
export const FIELD_TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export const WORKER_STATUSES = ["ACTIVE", "INACTIVE"] as const;

export const fieldWorkerSchema = z.object({
  fullName: z.string().trim().min(1).max(160),
  phone: z.string().trim().max(64).optional(),
  position: z.string().trim().max(160).optional(),
  photoKey: z.string().trim().max(255).optional(),
  status: z.enum(WORKER_STATUSES).default("ACTIVE"),
  notes: z.string().trim().max(5000).optional(),
});
export const updateFieldWorkerSchema = fieldWorkerSchema.extend({ id: uuid });

export const workerAssignmentSchema = z.object({
  workerId: uuid,
  blockId: uuid,
  startedAt: date,
  endedAt: date.optional(),
  notes: z.string().trim().max(5000).optional(),
}).superRefine((value, context) => {
  if (value.endedAt && value.endedAt < value.startedAt) context.addIssue({ code: "custom", path: ["endedAt"], message: "End date must not be before start date." });
});
export const endWorkerAssignmentSchema = z.object({ id: uuid, endedAt: date, notes: z.string().trim().max(5000).optional() });

export const fieldTaskSchema = z.object({
  blockId: uuid,
  assignedFieldOfficerId: uuid,
  assignedWorkerId: uuid.optional(),
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(10000).optional(),
  priority: z.enum(FIELD_TASK_PRIORITIES).default("MEDIUM"),
  dueDate: date.optional(),
});

export const updateFieldTaskSchema = z.object({
  id: uuid,
  assignedFieldOfficerId: uuid.optional(),
  assignedWorkerId: uuid.nullable().optional(),
  title: z.string().trim().min(1).max(255).optional(),
  description: z.string().trim().max(10000).nullable().optional(),
  priority: z.enum(FIELD_TASK_PRIORITIES).optional(),
  status: z.enum(FIELD_TASK_STATUSES).optional(),
  dueDate: date.nullable().optional(),
});

export const taskFiltersSchema = z.object({
  query: z.string().trim().max(100).optional(),
  status: z.enum(FIELD_TASK_STATUSES).optional(),
  priority: z.enum(FIELD_TASK_PRIORITIES).optional(),
  blockId: uuid.optional(),
  mine: z.coerce.boolean().optional(),
  ...dateRangeFields,
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
}).superRefine((value, context) => { if (value.dateFrom && value.dateTo && value.dateFrom > value.dateTo) context.addIssue({ code: "custom", path: ["dateTo"], message: "End date must not be before start date." }); });

export const workerFiltersSchema = z.object({
  query: z.string().trim().max(100).optional(),
  status: z.enum(WORKER_STATUSES).optional(),
  blockId: uuid.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
