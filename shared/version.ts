// Version is the single source of truth in agent/deno.json. Both the agent
// binary and the cloud read it from there:
//
//   - `deno compile` bundles the JSON file into the binary.
//   - `vite build` bundles it into the SSR server.
//   - `deno run` reads it directly from disk.
//
// Bumping the version: edit agent/deno.json — that's it. The bundled binary
// reports the new version via `chyi-cfg-agent version` and the cloud surfaces
// it via /api/live/health, so install.sh can compare and update.

import agentDeno from "../agent/deno.json" with { type: "json" };

export const VERSION: string = (agentDeno as { version?: string }).version ?? "0.0.0";
export const PROTOCOL_VERSION = 1;

export function version(): string {
  return VERSION;
}
