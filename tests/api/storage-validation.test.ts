import { describe, expect, it } from "vitest";

import { createStorageKey, localStoragePath, validateImageUpload, validateUpload } from "@/src/lib/storage";

describe("storage validation", () => {
  it("accepts supported image uploads within the production size limit", () => {
    expect(() => validateImageUpload({ contentType: "image/jpeg", size: 1024, originalName: "photo.jpg" })).not.toThrow();
  });

  it("rejects unsupported types, oversized files, and extension mismatches", () => {
    expect(() => validateUpload({ contentType: "image/svg+xml", size: 100, originalName: "photo.svg" })).toThrow("Unsupported file type.");
    expect(() => validateUpload({ contentType: "image/jpeg", size: 10 * 1024 * 1024 + 1, originalName: "photo.jpg" })).toThrow("File size");
    expect(() => validateUpload({ contentType: "image/jpeg", size: 100, originalName: "photo.png" })).toThrow("extension");
  });

  it("prevents traversal and creates scoped random object keys", () => {
    expect(() => localStoragePath("../outside.txt")).toThrow("Invalid media storage key.");
    const key = createStorageKey("blocks/123", "image/webp");
    expect(key).toMatch(/^blocks\/123\/[0-9a-f-]+\.webp$/);
  });
});
