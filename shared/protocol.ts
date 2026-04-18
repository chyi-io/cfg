// Wire protocol: the JSON envelope + command union spoken between browser,
// cloud relay, and agent. This file is the single source of truth — both
// sides type-check against it, so adding a new command means extending
// CommandName / CommandPayloads / CommandResponses here (the compiler will
// point at the driver handler + UI caller that still needs to be updated).
//
// See docs/protocol.md for human-readable semantics and the error code table.
// Bump PROTOCOL_VERSION on any breaking change; the cloud refuses agents
// that disagree, with a clear "update chyi-cfg-agent" message.

import type { RemoteNetInfo } from "./types.ts";
import type { Capability, DriverInfo } from "./capabilities.ts";
import type { ErrorBody } from "./errors.ts";

export const PROTOCOL_VERSION = 1;

export type CommandName =
  | "drivers.list"
  | "connection.open"
  | "connection.close"
  | "connection.info"
  | "connection.status"
  | "workmode.get"
  | "workmode.set"
  | "remotenet.get"
  | "remotenet.set"
  | "whitelist.get"
  | "whitelist.set";

export interface CommandPayloads {
  "drivers.list": Record<string, never>;
  "connection.open": { driver: string; ip: string; port: number; timeoutMs?: number };
  "connection.close": Record<string, never>;
  "connection.info": Record<string, never>;
  "connection.status": Record<string, never>;
  "workmode.get": Record<string, never>;
  "workmode.set": { workMode: number };
  "remotenet.get": Record<string, never>;
  "remotenet.set": RemoteNetInfo;
  "whitelist.get": { timeoutMs?: number };
  "whitelist.set": { cards: string[] };
}

export interface CommandResponses {
  "drivers.list": { drivers: DriverInfo[] };
  "connection.open": {
    driver: string;
    capabilities: Capability[];
    deviceInfo: unknown;
  };
  "connection.close": Record<string, never>;
  "connection.info": unknown;
  "connection.status": {
    open: boolean;
    driver?: string;
    capabilities?: Capability[];
    info?: unknown;
  };
  "workmode.get": { workMode: number };
  "workmode.set": Record<string, never>;
  "remotenet.get": RemoteNetInfo;
  "remotenet.set": Record<string, never>;
  "whitelist.get": { cards: string[] };
  "whitelist.set": { uploaded: number };
}

export type HelloEnvelope = {
  kind: "hello";
  agentId: string;
  agentVersion: string;
  protocolVersion: number;
};

export type ChallengeEnvelope = {
  kind: "challenge";
  nonce: string;
};

export type ChallengeResponseEnvelope = {
  kind: "challenge_response";
  agentId: string;
  sig: string;
};

export type AckEnvelope = {
  kind: "ack";
  ok: true;
  pairCode?: string;
  pairCodeExpiresAt?: number;
} | {
  kind: "ack";
  ok: false;
  error: ErrorBody;
};

export type ReqEnvelope = {
  kind: "req";
  id: string;
  traceId: string;
  cmd: CommandName;
  payload: unknown;
};

export type ResEnvelope =
  | { kind: "res"; id: string; traceId: string; ok: true; data: unknown }
  | { kind: "res"; id: string; traceId: string; ok: false; error: ErrorBody };

export type EventName =
  | "agent.connected"
  | "agent.disconnected"
  | "reader.opened"
  | "reader.closed";

export type EventEnvelope = {
  kind: "event";
  event: EventName;
  payload?: unknown;
};

export type PingEnvelope = { kind: "ping"; ts: number };
export type PongEnvelope = { kind: "pong"; ts: number };

export type Envelope =
  | HelloEnvelope
  | ChallengeEnvelope
  | ChallengeResponseEnvelope
  | AckEnvelope
  | ReqEnvelope
  | ResEnvelope
  | EventEnvelope
  | PingEnvelope
  | PongEnvelope;

export function encode(e: Envelope): string {
  return JSON.stringify(e);
}

export function decode(s: string): Envelope {
  const e = JSON.parse(s) as Envelope;
  if (typeof e !== "object" || e === null || typeof (e as { kind?: unknown }).kind !== "string") {
    throw new Error("Invalid envelope: missing kind");
  }
  return e;
}

/**
 * Convert a WebSocket URL to its sibling HTTP URL.
 *   wss://host/path  →  https://host/path
 *   ws://host/path   →  http://host/path
 * Other schemes pass through unchanged.
 *
 * NOTE: a single regex `/^wss?:/` would match `ws:` too and incorrectly map it
 * to `https:`. Always check `wss:` BEFORE `ws:` (or use this helper).
 */
export function wsUrlToHttp(url: string): string {
  if (url.startsWith("wss:")) return "https:" + url.substring(4);
  if (url.startsWith("ws:")) return "http:" + url.substring(3);
  return url;
}

/**
 * Strip a `/api/agent/ws` suffix to recover the origin URL of the cloud.
 */
export function stripAgentWsPath(url: string): string {
  return url.replace(/\/api\/agent\/ws$/, "");
}
