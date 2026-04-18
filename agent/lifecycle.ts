import { configLocation, loadConfig, saveConfig } from "./config.ts";
import { version } from "../shared/version.ts";
import { decode, encode, PROTOCOL_VERSION, stripAgentWsPath, wsUrlToHttp } from "../shared/protocol.ts";
import { hmacHex } from "../shared/pair.ts";
import { header, term } from "./term.ts";
import { initBuiltinDrivers } from "./drivers/index.ts";
import { listInfo as listDrivers } from "./drivers/registry.ts";

function shouldUseMock(): boolean {
  return Deno.env.get("CHYI_CFG_FFI") === "mock";
}

export function statusCmd(): number {
  initBuiltinDrivers();
  const cfg = loadConfig();
  header("chyi-cfg-agent status");
  console.log(`  ${term.gray("version    ")} ${version()}`);
  console.log(`  ${term.gray("agentId    ")} ${cfg.agentId}`);
  console.log(`  ${term.gray("cloud      ")} ${cfg.cloudUrl}`);
  console.log(`  ${term.gray("config     ")} ${configLocation()}`);
  console.log(`  ${term.gray("ffi        ")} ${shouldUseMock() ? "mock" : "native"}`);
  console.log(`  ${term.gray("drivers    ")} ${listDrivers().map((d) => d.id).join(", ")}`);
  return 0;
}

export async function doctorCmd(): Promise<number> {
  initBuiltinDrivers();
  const cfg = loadConfig();
  header("chyi-cfg-agent doctor");

  const results: { check: string; ok: boolean; detail?: string; hint?: string }[] = [];

  results.push({ check: "config loaded", ok: true, detail: configLocation() });

  if (!shouldUseMock()) {
    try {
      await import("./drivers/chafon-m200/lib.ts").then((m) => m.cfapi());
      results.push({ check: "libCFApi.so dlopen", ok: true });
    } catch (err) {
      results.push({
        check: "libCFApi.so dlopen",
        ok: false,
        detail: err instanceof Error ? err.message : String(err),
        hint: "Native libs should auto-extract from the bundled binary. Check that the cache dir (CHYI_CFG_AGENT_HOME or ~/.cache/chyi-cfg-agent) is writable. Last-resort override: set CHYI_CFG_AGENT_LIB_PATH to a custom libCFApi.so.",
      });
    }
  } else {
    results.push({ check: "ffi mode", ok: true, detail: "mock (CHYI_CFG_FFI=mock)" });
  }

  try {
    const base = new URL(stripAgentWsPath(wsUrlToHttp(cfg.cloudUrl)));
    const res = await fetch(new URL("/api/live/health", base), { method: "GET" });
    if (res.ok) {
      const body = await res.json() as { version?: string; protocolVersion?: number };
      results.push({
        check: "cloud reachable",
        ok: true,
        detail: `HTTP ${res.status}, server ${body.version ?? "?"} proto ${body.protocolVersion ?? "?"}`,
      });
    } else {
      results.push({ check: "cloud reachable", ok: false, detail: `HTTP ${res.status}` });
    }
  } catch (err) {
    results.push({
      check: "cloud reachable",
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
      hint: "Check that CHYI_CFG_URL points to a reachable cloud and that outbound 443 is open.",
    });
  }

  for (const r of results) {
    console.log(r.ok ? `  ${term.ok(r.check)}` : `  ${term.fail(r.check)}`);
    if (r.detail) console.log(`    ${term.gray(r.detail)}`);
    if (r.hint) console.log(`    ${term.yellow("hint: " + r.hint)}`);
  }
  console.log("");
  return results.every((r) => r.ok) ? 0 : 1;
}

export function versionCmd(): number {
  console.log(version());
  return 0;
}

export async function pairCmd(): Promise<number> {
  const cfg = loadConfig();
  header("Requesting pair code");
  console.log(`  cloud: ${term.cyan(cfg.cloudUrl)}`);
  console.log("");

  const result = await connectAndAwaitPairCode(cfg);
  if (!result.ok) {
    console.error(term.fail(`failed: ${result.error}`));
    return 1;
  }

  const url = stripAgentWsPath(wsUrlToHttp(cfg.cloudUrl));
  console.log(term.ok(`pair code: ${term.bold(result.code)}`));
  console.log(`  visit ${term.cyan(`${url}/live`)} and enter the code`);
  console.log(term.gray(`  expires ${new Date(result.expiresAt).toLocaleString()}`));
  return 0;
}

interface PairResult {
  ok: true;
  code: string;
  expiresAt: number;
}

async function connectAndAwaitPairCode(cfg: ReturnType<typeof loadConfig>): Promise<
  PairResult | { ok: false; error: string }
> {
  return await new Promise((resolve) => {
    const ws = new WebSocket(cfg.cloudUrl);
    let settled = false;
    const settle = (r: PairResult | { ok: false; error: string }) => {
      if (settled) return;
      settled = true;
      try { ws.close(); } catch (_) { /* ignore */ }
      resolve(r);
    };
    const timeout = setTimeout(() => settle({ ok: false, error: "timeout after 10s" }), 10000);

    ws.onopen = () => {
      ws.send(encode({
        kind: "hello",
        agentId: cfg.agentId,
        agentVersion: version(),
        protocolVersion: PROTOCOL_VERSION,
      }));
    };
    ws.onmessage = async (ev) => {
      const env = decode(ev.data as string);
      if (env.kind === "challenge") {
        const sig = await hmacHex(cfg.agentKey, env.nonce);
        ws.send(encode({ kind: "challenge_response", agentId: cfg.agentId, sig }));
        return;
      }
      if (env.kind === "ack") {
        clearTimeout(timeout);
        if (!env.ok) {
          settle({ ok: false, error: env.error.message });
          return;
        }
        if (env.pairCode && env.pairCodeExpiresAt) {
          settle({ ok: true, code: env.pairCode, expiresAt: env.pairCodeExpiresAt });
        } else {
          settle({ ok: false, error: "no pair code in ack" });
        }
      }
    };
    ws.onerror = () => settle({ ok: false, error: "websocket error" });
    ws.onclose = () => settle({ ok: false, error: "closed before ack" });
  });
}

export function resetCmd(): number {
  const cfg = loadConfig();
  header("Reset agent identity");
  console.log(term.yellow(
    "  This deletes the local agentId + agentKey at:",
  ));
  console.log(`    ${configLocation()}`);
  console.log(term.gray(
    "  Existing browser tokens (paired to old agentId) will stop working —\n" +
      "  pair again from /live after reset.",
  ));
  console.log("");
  if (!confirm("Continue?")) {
    console.log(term.dim("aborted"));
    return 0;
  }
  try {
    Deno.removeSync(configLocation());
    console.log(term.ok("config removed"));
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      console.log(term.dim("config not present"));
    } else {
      console.error(term.fail(`remove failed: ${err instanceof Error ? err.message : err}`));
      return 1;
    }
  }
  // Trigger lazy regenerate so user can confirm new identity.
  const next = loadConfig();
  console.log(`  ${term.gray("new agentId:")} ${next.agentId}`);
  void cfg;
  return 0;
}

export async function setupCmd(): Promise<number> {
  initBuiltinDrivers();
  header("chyi-cfg-agent setup");

  const isTTY = (() => {
    try {
      return Deno.stdin.isTerminal();
    } catch {
      return false;
    }
  })();
  if (!isTTY) {
    console.error(term.fail("setup needs an interactive terminal"));
    return 1;
  }

  const existing = (() => {
    try {
      return loadConfig();
    } catch {
      return undefined;
    }
  })();

  if (existing && existing.agentId) {
    console.log(term.gray(`  existing config: ${configLocation()}`));
    console.log(term.gray(`  agentId:         ${existing.agentId}`));
    console.log("");
    if (!confirm("Replace existing setup?")) {
      console.log(term.dim("aborted"));
      return 0;
    }
  }

  const defaultUrl = existing?.cloudUrl ?? "wss://cfg.chyi.io/api/agent/ws";
  const url = (prompt(`Cloud WebSocket URL [${defaultUrl}]:`)?.trim() || defaultUrl);
  if (!url.startsWith("ws://") && !url.startsWith("wss://")) {
    console.error(term.fail("URL must start with ws:// or wss://"));
    return 1;
  }

  saveConfig({
    cloudUrl: url,
    agentId: existing?.agentId ?? "",
    agentKey: existing?.agentKey ?? "",
    maxQueue: existing?.maxQueue ?? 16,
  });
  // Re-load to materialize agentId/agentKey defaults.
  const cfg = loadConfig();
  console.log("");
  console.log(term.ok("config saved"));
  console.log(`  ${term.gray("path     ")} ${configLocation()}`);
  console.log(`  ${term.gray("agentId  ")} ${cfg.agentId}`);
  console.log(`  ${term.gray("cloud    ")} ${cfg.cloudUrl}`);
  console.log("");

  console.log(term.step("running doctor..."));
  const code = await doctorCmd();
  console.log("");
  if (code === 0) {
    console.log(term.ok("setup complete"));
    console.log(term.gray("  next: chyi-cfg-agent run    (or systemctl --user start chyi-cfg-agent)"));
  } else {
    console.log(term.warn("setup saved but some checks failed — fix the items above before `chyi-cfg-agent run`"));
  }
  return 0;
}

export async function logsCmd(): Promise<number> {
  // Try systemd first; fall back to a hint.
  try {
    const child = new Deno.Command("journalctl", {
      args: ["--user", "-u", "chyi-cfg-agent", "-f", "-n", "50", "--output=cat"],
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    }).spawn();
    const status = await child.status;
    return status.code;
  } catch {
    console.error(term.fail("journalctl not available"));
    console.error(term.gray("  if running outside systemd, the agent logs to stdout — capture it there."));
    return 1;
  }
}

export function helpCmd(): number {
  const v = version();
  console.log(`${term.bold("chyi-cfg-agent")} ${term.gray(v)}`);
  console.log(term.dim("  LAN bridge between the cfg cloud UI and a local device."));
  console.log("");
  console.log(term.bold("USAGE"));
  console.log(`  chyi-cfg-agent ${term.cyan("<command>")} [flags]`);
  console.log("");
  console.log(term.bold("DAILY COMMANDS"));
  const daily: [string, string][] = [
    ["run", "(default, systemd runs this) connect to cloud + dispatch device commands"],
    ["pair", "one-shot: connect, get a fresh pair code, exit"],
    ["status", "version, agentId, cloud URL, config path, FFI mode, driver list"],
    ["doctor", "preflight checks (FFI dlopen, cloud reachability, glibc)"],
    ["logs", "follow the systemd journal (journalctl --user -u chyi-cfg-agent -f)"],
  ];
  for (const [c, d] of daily) console.log(`  ${term.cyan(c.padEnd(10))} ${d}`);
  console.log("");
  console.log(term.bold("LIFECYCLE"));
  const lifecycle: [string, string][] = [
    ["setup", "interactive first-time setup (cloud URL + identity + doctor)"],
    ["update", "in-place update to the latest cloud version (stop → swap → restart)"],
    ["reset", "rotate local agentId + agentKey (orphans existing browser tokens)"],
    ["uninstall", "remove binary, libs, config, systemd unit (full cleanup)"],
  ];
  for (const [c, d] of lifecycle) console.log(`  ${term.cyan(c.padEnd(10))} ${d}`);
  console.log("");
  console.log(term.bold("MISC"));
  const misc: [string, string][] = [
    ["version", "print version and exit"],
    ["help", "show this help"],
  ];
  for (const [c, d] of misc) console.log(`  ${term.cyan(c.padEnd(10))} ${d}`);
  console.log("");
  console.log(term.bold("FLAGS"));
  const flags: [string, string][] = [
    ["run --force", "start even if the systemd service is already running (expect conflicts)"],
    ["update --force", "reinstall / allow downgrade (passed to install.sh)"],
    ["update --no-start", "update the binary + unit without (re)starting the service"],
    ["uninstall --yes", "skip the confirmation prompt (for scripted use)"],
  ];
  for (const [c, d] of flags) console.log(`  ${term.cyan(c.padEnd(18))} ${d}`);
  console.log("");
  console.log(term.bold("ENVIRONMENT"));
  const envs: [string, string][] = [
    ["CHYI_CFG_URL", "cloud WebSocket URL (default: wss://cfg.chyi.io/api/agent/ws)"],
    ["CHYI_CFG_AGENT_HOME", "config + state dir (default: ~/.config/chyi-cfg-agent)"],
    ["CHYI_CFG_LOG_LEVEL", "debug | info | warn | error (default: info)"],
    ["CHYI_CFG_FFI", "set to `mock` for in-memory dev (no hardware)"],
    ["CHYI_CFG_AGENT_LIB_PATH", "override path to libCFApi.so (default: auto-extracted)"],
    ["NO_COLOR", "disable ANSI colors"],
  ];
  for (const [e, d] of envs) console.log(`  ${term.cyan(e.padEnd(24))} ${d}`);
  console.log("");
  console.log(term.bold("EXAMPLES"));
  console.log(term.gray("  # install (from the cloud's one-liner)"));
  console.log("  curl -fSL https://cfg.chyi.io/install.sh | bash");
  console.log("");
  console.log(term.gray("  # first-time setup (pick a cloud URL, run doctor)"));
  console.log("  chyi-cfg-agent setup");
  console.log("");
  console.log(term.gray("  # fresh pair code for another browser"));
  console.log("  chyi-cfg-agent pair");
  console.log("");
  console.log(term.gray("  # in-place update (will stop the service, swap binary, restart)"));
  console.log("  chyi-cfg-agent update");
  console.log("");
  console.log(term.gray("  # dev: run against a local cloud with the mock driver (no hardware needed)"));
  console.log("  CHYI_CFG_URL=ws://localhost:8001/api/agent/ws CHYI_CFG_FFI=mock chyi-cfg-agent run");
  console.log("");
  console.log(term.bold("LEARN MORE"));
  console.log("  docs:    https://cfg.chyi.io/docs/agent");
  console.log("  drivers: https://cfg.chyi.io/docs/drivers");
  console.log("");
  return 0;
}

/**
 * Re-run the cloud's install.sh against the configured cloud URL — drives an
 * in-place update via the existing installer's update flow (semver compare,
 * stop service, swap binary, restart). Forwards extra args to install.sh.
 */
export async function updateCmd(extraArgs: string[]): Promise<number> {
  const cfg = loadConfig();
  const base = stripAgentWsPath(wsUrlToHttp(cfg.cloudUrl));
  const url = `${base}/install.sh`;
  header("chyi-cfg-agent update");
  console.log(`  cloud: ${term.cyan(base)}`);
  console.log(`  fetching ${term.cyan(url)}`);
  console.log("");

  // Stream install.sh and pipe directly into bash; forward args.
  const curl = new Deno.Command("bash", {
    args: ["-c", `curl -fSL "${url}" | bash -s -- ${extraArgs.join(" ")}`],
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  }).spawn();
  const status = await curl.status;
  return status.code;
}

export async function uninstallCmd(autoYes = false): Promise<number> {
  header("Uninstall chyi-cfg-agent");

  const home = Deno.env.get("HOME") ?? "";
  const installDir = Deno.env.get("CHYI_CFG_AGENT_HOME") ?? `${home}/.local/share/chyi-cfg-agent`;
  const binSymlink = `${home}/.local/bin/chyi-cfg-agent`;
  const unitPath = `${home}/.config/systemd/user/chyi-cfg-agent.service`;
  const cacheDir = (() => {
    const xdg = Deno.env.get("XDG_CACHE_HOME");
    if (xdg) return `${xdg}/chyi-cfg-agent`;
    return `${home}/.cache/chyi-cfg-agent`;
  })();

  console.log(term.yellow("  This removes:"));
  console.log(`    ${installDir}        ${term.gray("(binary + extracted libs)")}`);
  console.log(`    ${binSymlink}                ${term.gray("(symlink in PATH)")}`);
  console.log(`    ${unitPath}        ${term.gray("(systemd user unit)")}`);
  console.log(`    ${cacheDir}        ${term.gray("(cached native libs)")}`);
  console.log(`    ${configLocation()}  ${term.gray("(agent identity + cloud URL)")}`);
  console.log("");
  console.log(term.gray(
    "  Existing browser tokens will stop working — they reference an agentId\n" +
      "  that will no longer exist. Pair again from /live after reinstall.",
  ));
  console.log("");
  if (!autoYes) {
    if (!confirm("Remove everything?")) {
      console.log(term.dim("aborted"));
      return 0;
    }
  } else {
    console.log(term.dim("(--yes: skipping confirmation)"));
  }

  let hadError = false;
  const step = (label: string, fn: () => void | Promise<void>): Promise<void> =>
    Promise.resolve(fn()).then(
      () => console.log(`  ${term.ok(label)}`),
      (err) => {
        hadError = true;
        console.log(`  ${term.fail(label)} ${term.gray(err instanceof Error ? err.message : String(err))}`);
      },
    );

  // 1. Stop + disable systemd unit (best effort).
  await step("stop chyi-cfg-agent.service", async () => {
    const r = await new Deno.Command("systemctl", {
      args: ["--user", "stop", "chyi-cfg-agent.service"],
      stdout: "null",
      stderr: "null",
    }).output().catch(() => null);
    if (!r) return; // systemctl not available
  });
  await step("disable chyi-cfg-agent.service", async () => {
    const r = await new Deno.Command("systemctl", {
      args: ["--user", "disable", "chyi-cfg-agent.service"],
      stdout: "null",
      stderr: "null",
    }).output().catch(() => null);
    if (!r) return;
  });

  // 2. Remove paths.
  const removePath = (p: string) => {
    try {
      Deno.removeSync(p, { recursive: true });
    } catch (err) {
      if (!(err instanceof Deno.errors.NotFound)) throw err;
    }
  };
  await step(`remove unit ${unitPath}`, () => removePath(unitPath));
  await step(`remove symlink ${binSymlink}`, () => removePath(binSymlink));
  await step(`remove ${installDir}`, () => removePath(installDir));
  await step(`remove ${cacheDir}`, () => removePath(cacheDir));
  await step(`remove config ${configLocation()}`, () => {
    try {
      Deno.removeSync(configLocation());
    } catch (err) {
      if (!(err instanceof Deno.errors.NotFound)) throw err;
    }
    // Try to remove the parent dir if empty.
    try {
      Deno.removeSync(configLocation().replace(/\/config\.json$/, ""));
    } catch {
      // dir not empty / not present — fine.
    }
  });

  // 3. systemctl daemon-reload (best effort).
  await new Deno.Command("systemctl", {
    args: ["--user", "daemon-reload"],
    stdout: "null",
    stderr: "null",
  }).output().catch(() => null);

  console.log("");
  if (hadError) {
    console.log(term.warn("uninstall finished with some errors — see above"));
    return 1;
  }
  console.log(term.ok("chyi-cfg-agent removed"));
  return 0;
}

export function welcomeBanner(): void {
  const lines = [
    "",
    term.bold("chyi-cfg-agent") + term.gray(`  v${version()}`),
    term.dim("  Live device configuration agent"),
    "",
  ];
  for (const l of lines) console.log(l);
}
