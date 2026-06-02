/** Normalize EAN-8 / EAN-13 / UPC barcodes to digits only. */
export function normalizeBarcode(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 8 && digits.length <= 14) return digits;
  return null;
}

export function foodIdFromBarcode(barcode: string): string {
  return `off:${barcode}`;
}

export function foodIdForUserProduct(): string {
  return `user:${crypto.randomUUID()}`;
}
