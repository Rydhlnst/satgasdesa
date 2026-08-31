import { describe, expect, it } from "vitest";

import { describeError } from "@/mobile/src/lib/feedback";

describe("mobile actionable errors", () => {
  it("preserves the backend reason and gives a next step", () => {
    const error = Object.assign(new Error("Jumlah iuran tidak sesuai dengan pengaturan keuangan yang berlaku."), {
      status: 400,
      code: "VALIDATION_FAILED",
      requestId: "request-123",
      userMessage: "Jumlah iuran tidak sesuai dengan pengaturan keuangan yang berlaku.",
    });

    expect(describeError(error, "Iuran tidak dapat disimpan.")).toMatchObject({
      title: "Periksa data",
      reason: "Jumlah iuran tidak sesuai dengan pengaturan keuangan yang berlaku.",
      nextStep: "Periksa data yang ditandai lalu coba lagi.",
      requestId: "request-123",
    });
  });

  it("maps permission and conflict failures to actionable guidance", () => {
    expect(describeError(Object.assign(new Error("Tidak diizinkan"), { status: 403, code: "FORBIDDEN" }), "Gagal.").nextStep).toContain("pengelola");
    expect(describeError(Object.assign(new Error("Data berubah"), { status: 409, code: "CONFLICT" }), "Gagal.").nextStep).toContain("data terbaru");
  });

  it("keeps diagnostic IDs separate from the user-facing reason", () => {
    const result = describeError(new Error("Server gagal memproses permintaan. Detail teknis: HTTP 500 · ID abc-123 · revisi server rev-7."), "Gagal.");
    expect(result.reason).toBe("Server gagal memproses permintaan.");
    expect(result.requestId).toBe("abc-123");
    expect(result.appRevision).toBe("rev-7");
  });
});
