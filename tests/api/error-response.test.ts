import { describe, expect, it } from "vitest";
import { z } from "zod";

import { apiErrorResponse, unauthorizedResponse } from "@/src/lib/mobile-api";

async function json(response: Response) {
  return response.json() as Promise<{ error: string; message: string }>;
}

describe("mobile API error responses", () => {
  it("does not expose internal exception details", async () => {
    const response = apiErrorResponse(new Error("ER_ACCESS_DENIED_ERROR: mysql password=secret"));
    const body = await json(response);

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: "REQUEST_FAILED", message: "Unable to process the request." });
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

    expect(syntaxResponse.status).toBe(400);
    expect(await json(syntaxResponse)).toEqual({ error: "VALIDATION_FAILED", message: "Invalid request data." });
    expect(zodResponse.status).toBe(400);
    expect(await json(zodResponse)).toEqual({ error: "VALIDATION_FAILED", message: "Invalid request data." });
  });

  it("returns the stable unauthorized contract", async () => {
    const response = unauthorizedResponse();
    expect(response.status).toBe(401);
    expect(await json(response)).toEqual({ error: "UNAUTHORIZED", message: "Your session is invalid or expired." });
  });
});
