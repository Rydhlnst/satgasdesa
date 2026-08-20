export type FormActionResult<TData = unknown> =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; data?: TData; message?: string }
  | { status: "validation-error"; fieldErrors: Record<string, string>; message?: string }
  | { status: "server-error"; message: string }
  | { status: "permission-error"; message: string };

export type GpsCaptureValue = {
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt: string;
};

export type OfflineDraftState = "local" | "unsynced" | "submitting" | "submitted" | "failed";
