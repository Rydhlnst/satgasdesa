import { describe, expect, it } from "vitest";

import { checkRateLimit } from "@/src/lib/rate-limit";

describe("API rate limiting", () => {
  it("blocks requests after the configured limit and returns a retry window", () => {
    const key = `test-${crypto.randomUUID()}`;
    expect(checkRateLimit(key, 2, 60_000).allowed).toBe(true);
    expect(checkRateLimit(key, 2, 60_000).allowed).toBe(true);
    const blocked = checkRateLimit(key, 2, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });
});
