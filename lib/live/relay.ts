/**
 * Socket registry + BroadcastChannel bridge.
 *
 * Agents and browsers may land in different Deno Deploy isolates. Each isolate
 * keeps its own `Map<agentId, WebSocket>` of *local* sockets, and we use a
 * BroadcastChannel keyed by agentId to route envelopes across isolates.
 *
 * For each agent, on connect we create a dedicated BroadcastChannel named
 * `agent:<agentId>`. Browsers that pair with that agentId also join the same
 * channel. Messages posted by one peer are delivered to all others — the
 * recipient (agent or browser) checks its local registry and handles only
 * those addressed to it.
 */

import type { Envelope } from "../../shared/protocol.ts";

interface AgentEntry {
  ws: WebSocket;
  channel: BroadcastChannel;
  browsers: Set<WebSocket>;
}

const agents = new Map<string, AgentEntry>();

// deno-lint-ignore no-explicit-any
type BridgeMsg = { to: "agent" | "browser"; env: any; browserToken?: string };

export function registerAgent(agentId: string, ws: WebSocket): AgentEntry {
  const existing = agents.get(agentId);
  if (existing) {
    // Newer connection wins; close the older socket.
    try {
      existing.ws.close(1000, "replaced");
    } catch (_) {
      // ignore
    }
    existing.channel.close();
    agents.delete(agentId);
  }

  const channel = new BroadcastChannel(`agent:${agentId}`);
  const entry: AgentEntry = { ws, channel, browsers: new Set() };
  agents.set(agentId, entry);

  channel.onmessage = (ev) => {
    const msg = ev.data as BridgeMsg;
    if (msg.to === "agent") {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg.env));
    }
    // "to: browser" is handled by the browser-side registrations below.
  };

  return entry;
}

export function unregisterAgent(agentId: string, ws: WebSocket): void {
  const entry = agents.get(agentId);
  if (!entry || entry.ws !== ws) return;
  entry.channel.close();
  for (const b of entry.browsers) {
    try {
      b.close(1001, "agent-disconnected");
    } catch (_) {
      // ignore
    }
  }
  agents.delete(agentId);
}

export function sendToAgent(agentId: string, env: Envelope): void {
  const entry = agents.get(agentId);
  if (entry && entry.ws.readyState === WebSocket.OPEN) {
    entry.ws.send(JSON.stringify(env));
    return;
  }
  // Fall through to BroadcastChannel — another isolate may own the agent WS.
  const ch = new BroadcastChannel(`agent:${agentId}`);
  ch.postMessage({ to: "agent", env } as BridgeMsg);
  ch.close();
}

export interface BrowserHandle {
  agentId: string;
  ws: WebSocket;
  dispose(): void;
}

export function registerBrowser(agentId: string, ws: WebSocket): BrowserHandle {
  const entry = agents.get(agentId);
  const channel = new BroadcastChannel(`agent:${agentId}`);

  const forwardToBrowser = (env: Envelope) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(env));
  };

  channel.onmessage = (ev) => {
    const msg = ev.data as BridgeMsg;
    if (msg.to === "browser") forwardToBrowser(msg.env);
  };

  if (entry) entry.browsers.add(ws);

  return {
    agentId,
    ws,
    dispose() {
      channel.close();
      const e = agents.get(agentId);
      if (e) e.browsers.delete(ws);
    },
  };
}

export function sendToBrowsers(agentId: string, env: Envelope): void {
  const entry = agents.get(agentId);
  if (entry) {
    for (const b of entry.browsers) {
      if (b.readyState === WebSocket.OPEN) b.send(JSON.stringify(env));
    }
  }
  const ch = new BroadcastChannel(`agent:${agentId}`);
  ch.postMessage({ to: "browser", env } as BridgeMsg);
  ch.close();
}

export function hasLocalAgent(agentId: string): boolean {
  return agents.has(agentId);
}
