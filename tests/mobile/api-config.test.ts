import { describe, expect, it } from "vitest";

import { PRODUCTION_API_URL, resolveMobileApiUrl } from "@/mobile/src/lib/api-config";

describe("mobile production API configuration", () => {
  it("always uses satgas.beres.io for production EAS profiles", () => {
    expect(resolveMobileApiUrl({ isProductionBuild: true, configuredApiUrl: "https://staging.example.com" })).toBe(PRODUCTION_API_URL);
  });

  it("allows a configured URL only outside production builds", () => {
    expect(resolveMobileApiUrl({ isProductionBuild: false, configuredApiUrl: "https://staging.example.com///" })).toBe("https://staging.example.com");
    expect(resolveMobileApiUrl({ isProductionBuild: false })).toBe(PRODUCTION_API_URL);
  });
});
