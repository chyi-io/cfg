import {
  type BrowserTokenPayload,
  signBrowserToken,
  verifyBrowserToken,
} from "../../shared/pair.ts";

function serverSecret(): string {
  const s = Deno.env.get("CFG_SERVER_SECRET");
  if (s && s.length >= 32) return s;
  // Dev-only fallback. Production MUST set CFG_SERVER_SECRET.
  return "dev-only-insecure-secret-do-not-use-in-production-32b";
}

export async function sign(
  agentId: string,
  ttlMs = 24 * 60 * 60 * 1000,
): Promise<{
  token: string;
  exp: number;
}> {
  const now = Date.now();
  const payload: BrowserTokenPayload = {
    agentId,
    iat: now,
    exp: now + ttlMs,
  };
  const token = await signBrowserToken(payload, serverSecret());
  return { token, exp: payload.exp };
}

export function verify(token: string): Promise<BrowserTokenPayload | null> {
  return verifyBrowserToken(token, serverSecret());
}
