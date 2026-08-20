export const INSPECTION_DRAFT_STATUS = "LOCAL_DRAFT" as const;
import type { OfflineDraftState } from "@/src/lib/ui/action-result";

export type InspectionDraftPayload = {
  blockId: string;
  inspectedAt: string;
  excavatorCount: string;
  workerCount: string;
  condition: string;
  findings: string;
  notes: string;
  gps: { latitude: number; longitude: number; accuracy: number; capturedAt: string } | null;
};

export type InspectionLocalDraft = {
  id: string;
  status: OfflineDraftState;
  savedAt: string;
  payload: InspectionDraftPayload;
};

const storageKey = (id: string) => `satgas:inspection-draft:v1:${id}`;

export function saveInspectionDraft(
  id: string,
  payload: InspectionDraftPayload,
  status: OfflineDraftState = "local",
): InspectionLocalDraft | null {
  if (typeof window === "undefined") return null;

  const draft: InspectionLocalDraft = {
    id,
    status,
    savedAt: new Date().toISOString(),
    payload,
  };

  try {
    window.localStorage.setItem(storageKey(id), JSON.stringify(draft));
    return draft;
  } catch {
    return null;
  }
}

export function loadInspectionDraft(id: string): InspectionLocalDraft | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(storageKey(id));
    if (!raw) return null;
    const draft = JSON.parse(raw) as InspectionLocalDraft;
    if (draft.id !== id) return null;
    return draft;
  } catch {
    return null;
  }
}

export function updateInspectionDraftStatus(id: string, status: OfflineDraftState): InspectionLocalDraft | null {
  const draft = loadInspectionDraft(id);
  if (!draft) return null;
  return saveInspectionDraft(id, draft.payload, status);
}

export function deleteInspectionDraft(id: string): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(storageKey(id));
  } catch {
    // Local storage may be unavailable in private browsing or restricted contexts.
  }
}
