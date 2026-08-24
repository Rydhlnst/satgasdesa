import * as SecureStore from "expo-secure-store";

const inspectionDraftKey = "satgas.mobile.inspection-draft";

export type LocalInspectionDraft = {
  blockId: string;
  inspectedAt?: string;
  excavatorCount: number;
  workerCount: number;
  condition: string;
  conditionRoad: string;
  conditionEnvironment: string;
  conditionActivity: string;
  findings?: string;
  notes?: string;
};

export async function loadInspectionDraft(): Promise<LocalInspectionDraft | null> {
  const value = await SecureStore.getItemAsync(inspectionDraftKey);
  if (!value) return null;
  try { return JSON.parse(value) as LocalInspectionDraft; } catch { await SecureStore.deleteItemAsync(inspectionDraftKey); return null; }
}

export function saveInspectionDraftLocally(draft: LocalInspectionDraft) {
  return SecureStore.setItemAsync(inspectionDraftKey, JSON.stringify(draft));
}

export function clearInspectionDraftLocally() {
  return SecureStore.deleteItemAsync(inspectionDraftKey);
}
