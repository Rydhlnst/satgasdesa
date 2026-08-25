import { describe, expect, it, vi } from "vitest";

vi.mock("@/src/lib/mobile-api", () => ({
  apiErrorResponse: (error: unknown) => Response.json({ error: error instanceof SyntaxError || (error instanceof Error && error.name === "ZodError") ? "VALIDATION_FAILED" : "REQUEST_FAILED", message: "safe" }, { status: error instanceof SyntaxError || (error instanceof Error && error.name === "ZodError") ? 400 : 500 }),
  withMobileSession: (_request: Request, callback: () => Promise<unknown>) => callback(),
}));

import { PATCH } from "@/app/api/mobile/admin/users/[id]/route";

describe("direct mutation route validation", () => {
  it.each(["not-json", JSON.stringify({}), JSON.stringify({ status: "ACTIVE", roleId: "BENDAHARA" })])("rejects malformed admin user updates: %s", async (body) => {
    const response = await PATCH(
      new Request("https://api.example.test/api/mobile/admin/users/00000000-0000-0000-0000-000000000000", { method: "PATCH", body, headers: { "content-type": "application/json" } }),
      { params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }) },
    );
    expect(response.status).toBe(400);
  });
});
