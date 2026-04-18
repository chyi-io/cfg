import { dirname, join } from "jsr:@std/path@^1";
import { ensureDirSync } from "jsr:@std/fs@^1";

export interface AgentConfig {
  cloudUrl: string;
  agentId: string;
  agentKey: string;
  maxQueue: number;
}

function configDir(): string {
  const override = Deno.env.get("CHYI_CFG_AGENT_HOME");
  if (override) return override;
  const xdg = Deno.env.get("XDG_CONFIG_HOME");
  if (xdg) return join(xdg, "chyi-cfg-agent");
  const home = Deno.env.get("HOME") ?? ".";
  return join(home, ".config", "chyi-cfg-agent");
}

function configPath(): string {
  return join(configDir(), "config.json");
}

function genKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let s = "";
  for (const b of bytes) s += b.toString(16).padStart(2, "0");
  return s;
}

function write(cfg: AgentConfig): void {
  const path = configPath();
  ensureDirSync(dirname(path));
  Deno.writeTextFileSync(path, JSON.stringify(cfg, null, 2));
  try {
    Deno.chmodSync(path, 0o600);
  } catch {
    // Windows or other OS without chmod — fine.
  }
}

export function saveConfig(cfg: AgentConfig): void {
  const merged: AgentConfig = {
    cloudUrl: cfg.cloudUrl,
    agentId: cfg.agentId || crypto.randomUUID(),
    agentKey: cfg.agentKey || genKey(),
    maxQueue: cfg.maxQueue || 16,
  };
  write(merged);
}

export function configExists(): boolean {
  try {
    Deno.statSync(configPath());
    return true;
  } catch {
    return false;
  }
}

export function loadConfig(): AgentConfig {
  const path = configPath();
  let stored: Partial<AgentConfig> = {};
  try {
    stored = JSON.parse(Deno.readTextFileSync(path)) as Partial<AgentConfig>;
  } catch (err) {
    if (!(err instanceof Deno.errors.NotFound)) throw err;
  }

  // `||` (truthy) rather than `??` (null/undefined): an empty string from a
  // partially-seeded config.json (e.g. install.sh writes only cloudUrl) should
  // trigger auto-generation, not be kept as "".
  const cfg: AgentConfig = {
    cloudUrl: Deno.env.get("CHYI_CFG_URL") || stored.cloudUrl ||
      "wss://cfg.chyi.io/api/agent/ws",
    agentId: stored.agentId || crypto.randomUUID(),
    agentKey: stored.agentKey || genKey(),
    maxQueue: stored.maxQueue || 16,
  };

  const needsWrite = !stored.agentId || !stored.agentKey ||
    stored.cloudUrl !== cfg.cloudUrl;
  if (needsWrite) write(cfg);

  return cfg;
}

export function configLocation(): string {
  return configPath();
}
