type RuntimeCrypto = {
  randomUUID?: () => string;
  getRandomValues?: (array: Uint8Array) => Uint8Array;
};

let fallbackCounter = 0;

function uuidFromBytes(bytes: Uint8Array): string {
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function createClientId(): string {
  const runtimeCrypto = (globalThis as typeof globalThis & { crypto?: RuntimeCrypto }).crypto;
  if (runtimeCrypto?.randomUUID) return runtimeCrypto.randomUUID();

  const bytes = new Uint8Array(16);
  if (runtimeCrypto?.getRandomValues) {
    runtimeCrypto.getRandomValues(bytes);
  } else {
    const seed = `${Date.now()}-${fallbackCounter++}`;
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = (seed.charCodeAt(index % seed.length) + Math.floor(Math.random() * 256)) & 0xff;
    }
  }
  return uuidFromBytes(bytes);
}
