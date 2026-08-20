"use server";

import { revalidatePath } from "next/cache";

import {
  createInspection,
  createInspectionUploadUrl,
  getInspectionPhotoDownloadUrl,
} from "@/src/features/inspections/service";

export type InspectionUploadInput = {
  inspectionId: string;
  contentType: string;
  size: number;
  originalName: string;
};

export type InspectionPayload = {
  id: string;
  blockId: string;
  inspectedAt?: Date;
  latitude: number;
  longitude: number;
  gpsAccuracy: number;
  gpsCapturedAt: Date;
  excavatorCount: number;
  workerCount: number;
  condition: string;
  findings?: string;
  notes?: string;
  photos: Array<{
    storageKey: string;
    contentType: string;
    size: number;
    originalName: string;
    capturedAt?: Date;
  }>;
};

export async function createInspectionUploadAction(input: InspectionUploadInput) {
  return createInspectionUploadUrl(input);
}

export async function createInspectionAction(input: InspectionPayload) {
  const result = await createInspection(input);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/inspections");
  revalidatePath(`/dashboard/inspections/${result.id}`);
  return result;
}

export async function getInspectionPhotoDownloadAction(input: { inspectionId: string; storageKey: string }) {
  return getInspectionPhotoDownloadUrl(input);
}
