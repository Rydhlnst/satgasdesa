import { describe, expect, it } from "vitest";
import { z } from "zod";

import { apiErrorResponse, unauthorizedResponse } from "@/src/lib/mobile-api";

async function json(response: Response) {
  return response.json() as Promise<{ error: string; message: string; diagnostics: { requestId: string; appRevision: string }; fields?: Record<string, string> }>;
}

describe("mobile API error responses", () => {
  it("does not expose internal exception details", async () => {
    const response = apiErrorResponse(new Error("ER_ACCESS_DENIED_ERROR: mysql password=secret"));
    const body = await json(response);

    expect(response.status).toBe(500);
    expect(body.error).toBe("REQUEST_FAILED");
    expect(body.message).toContain("Coolify");
    expect(body.diagnostics).toMatchObject({ appRevision: "unknown" });
    expect(body.diagnostics.requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(response.headers.get("x-request-id")).toBe(body.diagnostics.requestId);
    expect(response.headers.get("x-app-revision")).toBe("unknown");
    expect(JSON.stringify(body)).not.toContain("mysql");
    expect(JSON.stringify(body)).not.toContain("secret");
  });

  it("normalizes malformed JSON and schema failures to safe validation responses", async () => {
    const syntaxResponse = apiErrorResponse(new SyntaxError("Unexpected token at position 2"));
    let zodError: unknown;
    try {
      z.object({ id: z.string().uuid() }).parse({ id: "bad" });
    } catch (error) {
      zodError = error;
    }
    const zodResponse = apiErrorResponse(zodError);
    const syntaxBody = await json(syntaxResponse);

    expect(syntaxResponse.status).toBe(400);
    expect(syntaxBody.error).toBe("VALIDATION_FAILED");
    expect(syntaxBody.message).toBe("Invalid request data.");
    expect(zodResponse.status).toBe(400);
    expect(await json(zodResponse)).toMatchObject({ error: "VALIDATION_FAILED", message: "id: Invalid UUID", fields: { id: "Invalid UUID" }, diagnostics: { appRevision: "unknown" } });
  });

  it("returns the stable unauthorized contract", async () => {
    const response = unauthorizedResponse();
    expect(response.status).toBe(401);
    expect(await json(response)).toMatchObject({ error: "UNAUTHORIZED", message: "Your session is invalid or expired.", diagnostics: { appRevision: "unknown" } });
  });
});
