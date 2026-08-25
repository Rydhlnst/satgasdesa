import { describe, expect, it } from "vitest";

import { getActionErrorMessage } from "@/components/shared/action-form";

describe("server action feedback", () => {
  it("maps validation errors to user-safe feedback instead of an application error boundary", () => {
    expect(getActionErrorMessage(new Error("Please check the finance details and try again."))).toBe("Periksa kembali data yang diisi lalu coba lagi.");
  });

  it("does not expose internal error details", () => {
    expect(getActionErrorMessage(new Error("ER_LOCK_WAIT_TIMEOUT: internal database detail"))).toBe("Terjadi kesalahan. Coba lagi.");
  });
});
