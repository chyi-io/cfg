import { openKv } from "./pair_store.ts";

export async function allow(scope: string, key: string, max: number, windowMs: number): Promise<boolean> {
  const k = await openKv();
  const slot = Math.floor(Date.now() / windowMs);
  const kvKey = ["rl", scope, key, String(slot)];
  const r = await k.get<number>(kvKey);
  const count = (r.value ?? 0) + 1;
  await k.set(kvKey, count, { expireIn: windowMs * 2 });
  return count <= max;
}
