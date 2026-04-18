// Fetches the SHA256 for the current agent release's binary, with a KV-backed
// cache. The release workflow (.github/workflows/release.yml) uploads a
// `SHA256SUMS` asset alongside the binary; we parse the line matching the
// expected filename.
//
// Cache layout:
//   ["bin_sha", version, fileName] → { sha: string, fetchedAt: number }
//
// Cache policy: 24h success TTL, 5min negative TTL (so a missing SHA — e.g.
// during the short window between a tag push and the workflow finishing —
// doesn't block every install.sh request for the full TTL).

import { openKv } from "./pair_store.ts";

const GITHUB_OWNER = "chyi-io";
const GITHUB_REPO = "cfg";

const OK_TTL_MS = 24 * 60 * 60 * 1000;
const MISS_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  sha: string | null;
  fetchedAt: number;
}

function shaSumsUrl(version: string): string {
  return `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/download/v${version}/SHA256SUMS`;
}

function parseSha(sumsText: string, fileName: string): string | null {
  for (const line of sumsText.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Format: "<64-hex>  <filename>"
    const match = trimmed.match(/^([0-9a-fA-F]{64})\s+\*?(.+)$/);
    if (!match) continue;
    if (match[2] === fileName) return match[1].toLowerCase();
  }
  return null;
}

async function fetchFromGitHub(
  version: string,
  fileName: string,
): Promise<string | null> {
  try {
    const res = await fetch(shaSumsUrl(version), {
      headers: { accept: "text/plain" },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const text = await res.text();
    return parseSha(text, fileName);
  } catch {
    return null;
  }
}

/**
 * Get the SHA256 of the currently-published agent binary for `version`.
 * Returns null if the release doesn't exist yet, or its SHA256SUMS lacks
 * an entry for `fileName`. Callers should fall back to a placeholder (which
 * install.sh's `verify_sha` skips with a loud warning).
 */
export async function getBinSha256(
  version: string,
  fileName: string,
): Promise<string | null> {
  let kv: Deno.Kv | null = null;
  try {
    kv = await openKv();
  } catch {
    // No KV (very unusual). Fall through to uncached fetch.
  }
  const key = ["bin_sha", version, fileName];

  if (kv) {
    const cached = await kv.get<CacheEntry>(key);
    if (cached.value) {
      const age = Date.now() - cached.value.fetchedAt;
      const ttl = cached.value.sha ? OK_TTL_MS : MISS_TTL_MS;
      if (age < ttl) return cached.value.sha;
    }
  }

  const sha = await fetchFromGitHub(version, fileName);

  if (kv) {
    const ttl = sha ? OK_TTL_MS : MISS_TTL_MS;
    await kv.set(key, { sha, fetchedAt: Date.now() } satisfies CacheEntry, {
      expireIn: ttl,
    });
  }
  return sha;
}
