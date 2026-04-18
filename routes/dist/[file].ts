// Serves the compiled agent binary to the install script.
//
// Production: 302-redirects to the GitHub Release asset URL for the agent
// version currently in `agent/deno.json` (via shared/version.ts). Keeps the
// cloud deploy small — Deno Deploy can't hold a 200MB binary anyway.
//
// Dev: if `dist/chyi-cfg-agent` exists on disk (after `deno task
// agent:compile`), serves it straight from the filesystem so the full install
// one-liner works against `deno task dev` without needing a GitHub Release.
//
// Install script uses `curl -fSL`, which follows 302s transparently.

import { define } from "../../utils.ts";
import { join } from "jsr:@std/path@^1";
import { version } from "../../shared/version.ts";

const DIST_DIR = join(Deno.cwd(), "dist");
const GITHUB_OWNER = "chyi-io";
const GITHUB_REPO = "cfg";

/** Request-path validator. Accepts the canonical name and any
 * `chyi-cfg-agent-<stuff>` alias the install template constructs. */
function isValidFileName(requested: string): boolean {
  if (!requested || requested.includes("/") || requested.includes("..")) {
    return false;
  }
  if (requested === "chyi-cfg-agent") return true;
  return /^chyi-cfg-agent[-A-Za-z0-9._]*$/.test(requested);
}

function releaseAssetUrl(fileName: string, v: string): string {
  return `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/download/v${v}/${fileName}`;
}

async function serveFromDisk(requested: string): Promise<Response | null> {
  // Try the requested name first (e.g. chyi-cfg-agent-0.1.5-x86_64-linux),
  // then the canonical `chyi-cfg-agent` that `agent:compile` writes.
  for (const candidate of [requested, "chyi-cfg-agent"]) {
    const path = join(DIST_DIR, candidate);
    try {
      const file = await Deno.open(path, { read: true });
      const stat = await file.stat();
      if (!stat.isFile) {
        file.close();
        continue;
      }
      return new Response(file.readable, {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Length": String(stat.size),
          "Content-Disposition": `attachment; filename="${requested}"`,
          "Cache-Control": "no-store",
        },
      });
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) continue;
      throw err;
    }
  }
  return null;
}

export const handler = define.handlers({
  async GET(ctx) {
    const requested = ctx.params.file;
    if (!isValidFileName(requested)) {
      return new Response("Not found", { status: 404 });
    }

    // Prefer a local on-disk binary if one exists (dev convenience).
    const local = await serveFromDisk(requested);
    if (local) return local;

    // Otherwise redirect to the GitHub Release asset for the current version.
    const url = releaseAssetUrl(requested, version());
    return Response.redirect(url, 302);
  },
});
