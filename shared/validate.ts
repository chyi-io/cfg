export function assertString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new Error(`Field ${field}: expected string, got ${typeof value}`);
  }
  return value;
}

export function assertNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`Field ${field}: expected number, got ${typeof value}`);
  }
  return value;
}

export function assertByte(value: unknown, field: string): number {
  const n = assertNumber(value, field);
  if (!Number.isInteger(n) || n < 0 || n > 255) {
    throw new Error(`Field ${field}: expected uint8 (0..255), got ${n}`);
  }
  return n;
}

export function assertU16(value: unknown, field: string): number {
  const n = assertNumber(value, field);
  if (!Number.isInteger(n) || n < 0 || n > 65535) {
    throw new Error(`Field ${field}: expected uint16 (0..65535), got ${n}`);
  }
  return n;
}

export function assertBool(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`Field ${field}: expected boolean, got ${typeof value}`);
  }
  return value;
}

export function assertIPv4(value: unknown, field: string): string {
  const s = assertString(value, field);
  const parts = s.split(".");
  if (parts.length !== 4) {
    throw new Error(`Field ${field}: invalid IPv4 '${s}'`);
  }
  for (const p of parts) {
    const n = Number.parseInt(p, 10);
    if (Number.isNaN(n) || n < 0 || n > 255 || String(n) !== p) {
      throw new Error(`Field ${field}: invalid IPv4 octet '${p}'`);
    }
  }
  return s;
}

export function assertHex(
  value: unknown,
  field: string,
  maxBytes = 31,
): string {
  const s = assertString(value, field);
  if (!/^[0-9a-fA-F]*$/.test(s)) {
    throw new Error(`Field ${field}: expected hex string`);
  }
  if (s.length % 2 !== 0) {
    throw new Error(`Field ${field}: hex string must have even length`);
  }
  if (s.length / 2 > maxBytes) {
    throw new Error(
      `Field ${field}: hex too long (${s.length / 2} > ${maxBytes} bytes)`,
    );
  }
  return s.toUpperCase();
}

export function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const buf = new Uint8Array(new ArrayBuffer(hex.length / 2));
  for (let i = 0; i < hex.length; i += 2) {
    buf[i / 2] = Number.parseInt(hex.substring(i, i + 2), 16);
  }
  return buf;
}

export function bytesToHex(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += b.toString(16).padStart(2, "0");
  return s.toUpperCase();
}
