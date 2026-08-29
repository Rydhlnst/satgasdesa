import { describe, expect, it } from "vitest";

import { isUuid } from "@/mobile/src/lib/read";

describe("budget period id validation", () => {
  it("accepts UUID period ids", () => {
    expect(isUuid("11111111-1111-4111-8111-111111111111")).toBe(true);
  });

  it("rejects missing and placeholder ids", () => {
    expect(isUuid("")).toBe(false);
    expect(isUuid("-")).toBe(false);
    expect(isUuid("not-a-period-id")).toBe(false);
    expect(isUuid(undefined)).toBe(false);
  });
});
