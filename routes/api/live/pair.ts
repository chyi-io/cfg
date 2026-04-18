import { define } from "../../../utils.ts";
import { jsonResponse } from "../../../lib/http.ts";
import { normalizePairCode } from "../../../shared/pair.ts";
import { consumePairCode, putToken } from "../../../lib/live/pair_store.ts";
import { sign } from "../../../lib/live/token.ts";
import { allow } from "../../../lib/live/rate_limit.ts";

export const handler = define.handlers({
  async POST(ctx) {
    // Rate-limit per source IP in production (behind a reverse proxy that
    // sets X-Forwarded-For or X-Real-IP). Direct connections — including
    // local dev — have no way for the server to tell sources apart, and
    // bucketing every request under "unknown" would exhaust the limit in
    // a few curl retries. Pair codes are single-use + 10-min TTL, so
    // direct-connection abuse potential is negligible.
    const ip = ctx.req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      ctx.req.headers.get("x-real-ip") ?? null;
    if (ip) {
      if (!(await allow("pair", ip, 30, 15 * 60 * 1000))) {
        return jsonResponse({ error: "rate-limited" }, 429);
      }
    }

    let body: { code?: unknown };
    try {
      body = await ctx.req.json();
    } catch {
      return jsonResponse({ error: "invalid JSON" }, 400);
    }
    if (typeof body.code !== "string") {
      return jsonResponse({ error: "code required" }, 400);
    }
    const normalized = normalizePairCode(body.code);
    if (normalized.length !== 8) {
      return jsonResponse({ error: "code format invalid" }, 400);
    }
    const formatted = `${normalized.substring(0, 4)}-${normalized.substring(4)}`;

    const agentId = await consumePairCode(formatted) ?? await consumePairCode(normalized);
    if (!agentId) {
      return jsonResponse({ error: "code invalid or expired" }, 404);
    }

    const { token, exp } = await sign(agentId);
    await putToken(token, agentId, exp);
    return jsonResponse({ token, exp, agentId });
  },
});
