// End-to-end smoke test against a running `dev:mock` cloud + agent.
//
// Usage: CFG_DEV_PORT=8001 deno run -A --unstable-kv scripts/smoke_e2e.ts
//
// Drives: pair -> open browser WS -> connection.open -> connection.info ->
//         workmode.set -> workmode.get -> remotenet.set -> remotenet.get ->
//         whitelist.set -> whitelist.get -> connection.close.
// Prints PASS/FAIL per step and exits non-zero on any failure.

import type {
  CommandName,
  CommandPayloads,
  CommandResponses,
  ResEnvelope,
} from "../shared/protocol.ts";

const port = Number.parseInt(Deno.env.get("CFG_DEV_PORT") ?? "8001", 10);
const base = `http://localhost:${port}`;

async function readPairCode(): Promise<string> {
  const log = await Deno.readTextFile("/tmp/cfg-dev.log");
  const lines = log.split("\n").filter((l) => l.includes("pair at"));
  if (lines.length === 0) throw new Error("no pair code in log");
  const last = lines[lines.length - 1];
  const m = last.match(/code\s+([A-Z0-9-]+)/);
  if (!m) throw new Error(`could not parse pair code from: ${last}`);
  return m[1];
}

async function pair(code: string): Promise<{ token: string; agentId: string }> {
  const r = await fetch(`${base}/api/live/pair`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  if (!r.ok) throw new Error(`pair failed: HTTP ${r.status} ${await r.text()}`);
  return await r.json();
}

function step(name: string, ok: boolean, detail = ""): void {
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) Deno.exit(1);
}

async function main() {
  const code = await readPairCode();
  step("read pair code from log", true, code);

  const { token, agentId } = await pair(code);
  step("paired", true, `agent ${agentId.substring(0, 8)}`);

  const ws = new WebSocket(
    `ws://localhost:${port}/api/live/ws?token=${encodeURIComponent(token)}`,
  );
  await new Promise<void>((resolve, reject) => {
    ws.onopen = () => resolve();
    ws.onerror = (e) =>
      reject(new Error(`ws.error: ${(e as ErrorEvent).message ?? e.type}`));
    setTimeout(() => reject(new Error("ws.connect timeout")), 5000);
  });
  step("browser WS open", true);

  const pending = new Map<
    string,
    { res: (v: unknown) => void; rej: (e: unknown) => void }
  >();
  ws.onmessage = (ev) => {
    const env = JSON.parse(ev.data as string) as ResEnvelope;
    if (env.kind !== "res") return;
    const p = pending.get(env.id);
    if (!p) return;
    pending.delete(env.id);
    if (env.ok) p.res(env.data);
    else p.rej(env.error);
  };

  const req = <K extends CommandName>(cmd: K, payload: CommandPayloads[K]) =>
    new Promise<CommandResponses[K]>((resolve, reject) => {
      const id = crypto.randomUUID();
      pending.set(id, {
        res: (v) => resolve(v as CommandResponses[K]),
        rej: reject,
      });
      ws.send(JSON.stringify({ kind: "req", id, traceId: id, cmd, payload }));
      setTimeout(() => {
        if (pending.delete(id)) reject(new Error(`timeout: ${cmd}`));
      }, 5000);
    });

  const drivers = await req("drivers.list", {});
  step(
    "drivers.list",
    drivers.drivers.length > 0,
    drivers.drivers.map((d) => d.id).join(","),
  );

  const open = await req("connection.open", {
    driver: "chafon-m200",
    ip: "192.168.1.250",
    port: 9090,
  });
  const info = open.deviceInfo as { firmVersion: string };
  step("connection.open", !!open.deviceInfo, info.firmVersion);

  const cInfo = await req("connection.info", {}) as { sn: string };
  step("connection.info", cInfo.sn.length > 0, cInfo.sn);

  await req("workmode.set", { workMode: 2 });
  const wm = await req("workmode.get", {});
  step("workmode round-trip", wm.workMode === 2, `wm=${wm.workMode}`);

  await req("remotenet.set", {
    enabled: true,
    ip: "10.0.0.5",
    port: 7000,
    heartTime: 30,
  });
  const rn = await req("remotenet.get", {});
  step(
    "remotenet round-trip",
    rn.enabled && rn.ip === "10.0.0.5" && rn.port === 7000 &&
      rn.heartTime === 30,
    `${rn.ip}:${rn.port}`,
  );

  const upload = await req("whitelist.set", {
    cards: ["DEADBEEF", "1122AABB", "C0FFEE01"],
  });
  const wl = await req("whitelist.get", {});
  step(
    "whitelist round-trip",
    upload.uploaded === 3 && wl.cards.length === 3 &&
      wl.cards[0] === "DEADBEEF",
    `${wl.cards.length} cards`,
  );

  await req("connection.close", {});
  step("connection.close", true);

  ws.close();
  console.log("\nALL PASS");
}

await main();
