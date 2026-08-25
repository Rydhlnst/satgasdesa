import { clearOfflineDraft, loadOfflineDraft, saveOfflineDraft } from "../offline/store";

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
  return (await loadOfflineDraft<LocalInspectionDraft>("inspection"))?.payload ?? null;
}

export function saveInspectionDraftLocally(draft: LocalInspectionDraft) {
  return saveOfflineDraft("inspection", draft);
}

export function clearInspectionDraftLocally() {
  return clearOfflineDraft("inspection");
}
