// Serves agent build artifacts from <repo>/dist/. The compile task writes
// `dist/chyi-cfg-agent`; the install script downloads it from this route.

import { define } from "../../utils.ts";
import { join } from "jsr:@std/path@^1";

const DIST_DIR = join(Deno.cwd(), "dist");

// Allow the canonical name and any `chyi-cfg-agent-<version>-<target>` alias the
// install template might construct.
function resolveOnDisk(requested: string): string | null {
  if (requested.includes("/") || requested.includes("..")) return null;
  if (requested === "chyi-cfg-agent") return join(DIST_DIR, "chyi-cfg-agent");
  if (/^chyi-cfg-agent[-A-Za-z0-9._]*$/.test(requested)) return join(DIST_DIR, "chyi-cfg-agent");
  return null;
}

export const handler = define.handlers({
  async GET(ctx) {
    const path = resolveOnDisk(ctx.params.file);
    if (!path) return new Response("Not found", { status: 404 });
    try {
      const file = await Deno.open(path, { read: true });
      const stat = await file.stat();
      return new Response(file.readable, {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Length": String(stat.size),
          "Content-Disposition": `attachment; filename="${ctx.params.file}"`,
          "Cache-Control": "no-store",
        },
      });
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) {
        return new Response(
          `Binary not built yet. Run: deno task agent:compile\n` +
            `(expected at ${path})\n`,
          { status: 404, headers: { "Content-Type": "text/plain" } },
        );
      }
      throw err;
    }
  },
});
