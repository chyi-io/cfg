/**
 * Deno KV–backed store for agent keys, pair codes, and token bindings.
 *
 * Key layout:
 *   ["agents", agentId]                 → { agentKey, createdAt }   (TOFU key store)
 *   ["pair", code]                      → { agentId, expiresAt }    (single-use)
 *   ["tokens", browserToken]            → { agentId, exp }          (for revocation)
 */

let kv: Deno.Kv | null = null;

export async function openKv(): Promise<Deno.Kv> {
  if (!kv) kv = await Deno.openKv();
  return kv;
}

export interface AgentKeyRecord {
  agentKey: string;
  createdAt: number;
}

export async function getAgentKey(agentId: string): Promise<string | null> {
  const k = await openKv();
  const r = await k.get<AgentKeyRecord>(["agents", agentId]);
  return r.value?.agentKey ?? null;
}

export async function putAgentKey(agentId: string, agentKey: string): Promise<void> {
  const k = await openKv();
  await k.set(["agents", agentId], { agentKey, createdAt: Date.now() });
}

export interface PairRecord {
  agentId: string;
  expiresAt: number;
}

export async function putPairCode(code: string, agentId: string, ttlMs: number): Promise<number> {
  const k = await openKv();
  const expiresAt = Date.now() + ttlMs;
  await k.set(["pair", code], { agentId, expiresAt }, { expireIn: ttlMs });
  return expiresAt;
}

export async function consumePairCode(code: string): Promise<string | null> {
  const k = await openKv();
  const r = await k.get<PairRecord>(["pair", code]);
  if (!r.value) return null;
  if (Date.now() > r.value.expiresAt) {
    await k.delete(["pair", code]);
    return null;
  }
  // Atomic single-use: delete only if versionstamp matches.
  const commit = await k.atomic()
    .check({ key: ["pair", code], versionstamp: r.versionstamp })
    .delete(["pair", code])
    .commit();
  return commit.ok ? r.value.agentId : null;
}

export interface TokenRecord {
  agentId: string;
  exp: number;
}

export async function putToken(token: string, agentId: string, exp: number): Promise<void> {
  const k = await openKv();
  await k.set(["tokens", token], { agentId, exp }, { expireIn: Math.max(0, exp - Date.now()) });
}

export async function revokeTokensForAgent(agentId: string): Promise<number> {
  const k = await openKv();
  let count = 0;
  for await (const e of k.list<TokenRecord>({ prefix: ["tokens"] })) {
    if (e.value.agentId === agentId) {
      await k.delete(e.key);
      count++;
    }
  }
  return count;
}
