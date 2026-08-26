import { describe, expect, it } from "vitest";

import { assertFileSignature, createStorageKey, localStoragePath, validateImageUpload, validateUpload } from "@/src/lib/storage";

describe("storage validation", () => {
  it("accepts supported image uploads within the production size limit", () => {
    expect(() => validateImageUpload({ contentType: "image/jpeg", size: 1024, originalName: "photo.jpg" })).not.toThrow();
    expect(() => validateImageUpload({ contentType: "IMAGE/JPEG", size: 1024, originalName: "photo.jpg" })).not.toThrow();
  });

  it("rejects unsupported types, oversized files, and extension mismatches", () => {
    expect(() => validateUpload({ contentType: "image/svg+xml", size: 100, originalName: "photo.svg" })).toThrow("Unsupported file type.");
    expect(() => validateUpload({ contentType: "image/jpeg", size: 10 * 1024 * 1024 + 1, originalName: "photo.jpg" })).toThrow("File size");
    const invalidSize = () => validateUpload({ contentType: "image/jpeg", size: 0, originalName: "photo.jpg" });
    expect(invalidSize).toThrow("File size");
    try { invalidSize(); } catch (error) { expect(error).toMatchObject({ code: "VALIDATION_FAILED", status: 400 }); }
    expect(() => validateUpload({ contentType: "image/jpeg", size: 100, originalName: "photo.png" })).toThrow("extension");
  });

  it("prevents traversal and creates scoped random object keys", () => {
    expect(() => localStoragePath("../outside.txt")).toThrow("Invalid media storage key.");
    const key = createStorageKey("blocks/123", "image/webp");
    expect(key).toMatch(/^blocks\/123\/[0-9a-f-]+\.webp$/);
  });

  it("rejects files whose bytes do not match the declared type", () => {
    expect(() => assertFileSignature("image/jpeg", new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]))).toThrow("content does not match");
    expect(() => assertFileSignature("image/png", new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]))).not.toThrow();
    expect(() => assertFileSignature("application/pdf", new TextEncoder().encode("%PDF-1.7"))).not.toThrow();
  });
});
