// Spawns the dev stack on TWO ports that both work end-to-end:
//
//   - cloud (deno serve _fresh/server.js, port 8001) — handles WebSocket
//     upgrades and HTTP API. This is the "real" backend.
//   - vite (port 5173) — SPA HMR + serves Fresh routes via the @fresh/plugin-vite
//     middleware. WebSocket endpoints (/api/agent/ws, /api/live/ws) are
//     proxied to port 8001 via vite.config.ts so 5173 is fully usable too.
//   - agent (mock FFI by default) — points at port 5173 by default so the
//     URLs in install.sh, the install snippet, and pair output match what
//     the user sees in the browser.
//
// Either port serves the full app. Shuts everything down on Ctrl-C.

import { dirname, fromFileUrl, join } from "jsr:@std/path@^1";

const ROOT = dirname(dirname(fromFileUrl(import.meta.url)));
const AGENT_DIR = join(ROOT, "agent");

const cloudPort = Number.parseInt(Deno.env.get("CFG_DEV_PORT") ?? "8001", 10);
const vitePort = Number.parseInt(Deno.env.get("CFG_DEV_VITE_PORT") ?? "5173", 10);
// Agent connects directly to the cloud port — Vite can't proxy WS upgrades
// through the Fresh plugin pipeline. The browser can use either port; install.sh
// handles the Vite→cloud rewrite for that path.
const agentTarget = Deno.env.get("CFG_DEV_URL") ??
  `ws://localhost:${cloudPort}/api/agent/ws`;
const ffi = Deno.env.get("CHYI_CFG_FFI") ?? "mock";

console.log(
  `[dev_all] cloud http://localhost:${cloudPort}  |  vite http://localhost:${vitePort}  |  ` +
    `agent ffi=${ffi}  →  ${agentTarget}`,
);

console.log("[dev_all] building (vite)...");
const build = await new Deno.Command("deno", {
  args: ["task", "build"],
  cwd: ROOT,
  stdout: "inherit",
  stderr: "inherit",
}).spawn().status;
if (!build.success) {
  console.error("[dev_all] build failed");
  Deno.exit(1);
}

const cloud = new Deno.Command("deno", {
  args: ["serve", "-A", "--unstable-kv", "--port", String(cloudPort), "_fresh/server.js"],
  cwd: ROOT,
  stdout: "inherit",
  stderr: "inherit",
}).spawn();

const vite = new Deno.Command("deno", {
  args: ["task", "dev:vite", "--", "--port", String(vitePort), "--strictPort"],
  cwd: ROOT,
  stdout: "inherit",
  stderr: "inherit",
}).spawn();

await new Promise((r) => setTimeout(r, 2000));

const agent = new Deno.Command("deno", {
  args: ["task", ffi === "mock" ? "dev:mock" : "dev"],
  cwd: AGENT_DIR,
  env: {
    CHYI_CFG_URL: agentTarget,
    CHYI_CFG_FFI: ffi,
    CHYI_CFG_AGENT_HOME: join(ROOT, ".dev-agent"),
  },
  stdout: "inherit",
  stderr: "inherit",
}).spawn();

const stop = () => {
  console.log("\n[dev_all] shutting down...");
  for (const c of [cloud, vite, agent]) {
    try { c.kill("SIGTERM"); } catch (_) { /* ignore */ }
  }
  Promise.allSettled([cloud.status, vite.status, agent.status]).then(() => Deno.exit(0));
};
Deno.addSignalListener("SIGINT", stop);
try { Deno.addSignalListener("SIGTERM", stop); } catch (_) { /* not on Windows */ }

const [cloudStatus, viteStatus, agentStatus] = await Promise.all([
  cloud.status,
  vite.status,
  agent.status,
]);
if (!cloudStatus.success) console.error(`[dev_all] cloud exited: ${cloudStatus.code}`);
if (!viteStatus.success) console.error(`[dev_all] vite exited: ${viteStatus.code}`);
if (!agentStatus.success) console.error(`[dev_all] agent exited: ${agentStatus.code}`);
Deno.exit(cloudStatus.success && viteStatus.success && agentStatus.success ? 0 : 1);
