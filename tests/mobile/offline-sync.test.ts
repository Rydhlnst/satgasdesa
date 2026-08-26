import { describe, expect, it } from "vitest";

import { classifySyncError } from "@/mobile/src/offline/errors";

describe("offline sync failure classification", () => {
  it("quarantines validation and permission failures", () => {
    expect(classifySyncError(Object.assign(new Error("Block is not assigned to you."), { status: 403 })).retryable).toBe(false);
    expect(classifySyncError(Object.assign(new Error("Invalid request data."), { status: 400 })).retryable).toBe(false);
    expect(classifySyncError(Object.assign(new Error("Conflict"), { status: 409 })).retryable).toBe(false);
  });

  it("retries network and server failures", () => {
    expect(classifySyncError(new Error("Koneksi ke API timeout.")).retryable).toBe(true);
    expect(classifySyncError(Object.assign(new Error("Service unavailable"), { status: 503 })).retryable).toBe(true);
    expect(classifySyncError(Object.assign(new Error("Too many requests"), { status: 429 })).retryable).toBe(true);
  });
});
