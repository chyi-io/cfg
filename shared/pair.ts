const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generatePairCode(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
    if (i === 3) out += "-";
  }
  return out;
}

export function normalizePairCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

const enc = new TextEncoder();

async function hmacKey(secret: string): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function base64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replaceAll(
    "=",
    "",
  );
}

function base64urlDecode(s: string): Uint8Array<ArrayBuffer> {
  const padded = s.replaceAll("-", "+").replaceAll("_", "/") +
    "=".repeat((4 - (s.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export interface BrowserTokenPayload {
  agentId: string;
  exp: number;
  iat: number;
}

export async function signBrowserToken(
  payload: BrowserTokenPayload,
  secret: string,
): Promise<string> {
  const body = base64urlEncode(enc.encode(JSON.stringify(payload)));
  const key = await hmacKey(secret);
  const sig = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, enc.encode(body)),
  );
  return `${body}.${base64urlEncode(sig)}`;
}

export async function verifyBrowserToken(
  token: string,
  secret: string,
  now = Date.now(),
): Promise<BrowserTokenPayload | null> {
  const dot = token.indexOf(".");
  if (dot < 0) return null;
  const body = token.substring(0, dot);
  const sig = token.substring(dot + 1);
  const key = await hmacKey(secret);
  const sigBytes = base64urlDecode(sig);
  const ok = await crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes,
    enc.encode(body),
  );
  if (!ok) return null;
  try {
    const payload = JSON.parse(
      new TextDecoder().decode(base64urlDecode(body)),
    ) as BrowserTokenPayload;
    if (
      typeof payload.agentId !== "string" || typeof payload.exp !== "number"
    ) return null;
    if (now > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function hmacHex(
  secret: string,
  message: string,
): Promise<string> {
  const key = await hmacKey(secret);
  const sig = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, enc.encode(message)),
  );
  let s = "";
  for (const b of sig) s += b.toString(16).padStart(2, "0");
  return s;
}
