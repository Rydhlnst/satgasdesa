import { describe, expect, it, vi } from "vitest";

vi.mock("@/src/lib/mobile-api", () => ({
  apiErrorResponse: (error: unknown) => Response.json({ error: error instanceof SyntaxError || (error instanceof Error && error.name === "ZodError") ? "VALIDATION_FAILED" : "REQUEST_FAILED", message: "safe" }, { status: error instanceof SyntaxError || (error instanceof Error && error.name === "ZodError") ? 400 : 500 }),
  withMobileSession: (_request: Request, callback: () => Promise<unknown>) => callback(),
}));

import { POST } from "@/app/api/mobile/workflows/route";
import { workflowPermissions } from "@/src/lib/mobile-workflow-policy";

describe("mobile workflow CRUD contract", () => {
  it("requires permission metadata for every registered workflow action", () => {
    expect(Object.keys(workflowPermissions).length).toBeGreaterThan(60);
    for (const permission of Object.values(workflowPermissions)) {
      expect(permission).toMatch(/^[A-Z][A-Z0-9_]+$/);
    }
  });

  it.each([
    ["malformed JSON", "not-json"],
    ["missing action", JSON.stringify({ input: {} })],
    ["prototype action", JSON.stringify({ action: "__proto__" })],
    ["inherited constructor action", JSON.stringify({ action: "constructor" })],
  ])("rejects %s before invoking a CRUD handler", async (_label, body) => {
    const response = await POST(new Request("https://api.example.test/api/mobile/workflows", { method: "POST", body, headers: { "content-type": "application/json" } }));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("VALIDATION_FAILED");
  });
});
