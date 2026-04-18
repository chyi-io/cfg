# Wire Protocol

JSON-over-WebSocket. Both browser↔cloud and cloud↔agent links use the same
envelope schema, defined once in [`shared/protocol.ts`](../shared/protocol.ts).
That file is the source of truth — this doc is a human-readable index.

- [Envelope kinds](#envelope-kinds)
- [Commands](#commands)
- [Capabilities](#capabilities)
- [Errors](#errors)
- [Versioning](#versioning)
- [Trace correlation](#trace-correlation)

## Envelope kinds

```ts
type Envelope =
  | { kind: "hello"; agentId; agentVersion; protocolVersion }
  | { kind: "challenge"; nonce }
  | { kind: "challenge_response"; agentId; sig }
  | { kind: "ack"; ok: true; pairCode?; pairCodeExpiresAt? }
  | { kind: "ack"; ok: false; error: ErrorBody }
  | { kind: "req"; id; traceId; cmd: CommandName; payload }
  | { kind: "res"; id; traceId; ok: true; data }
  | { kind: "res"; id; traceId; ok: false; error: ErrorBody }
  | { kind: "event"; event: EventName; payload? }
  | { kind: "ping"; ts }
  | { kind: "pong"; ts };
```

`id` is generated browser-side and correlates a `req` to its `res`. `traceId` is
also browser-generated and stamped into every log line along the path for
end-to-end request tracing.

### Handshake (cloud ↔ agent)

```
agent  ─── hello              ──> cloud
agent  <── challenge(nonce)   ─── cloud
agent  ─── challenge_response ──> cloud        (HMAC(agentKey, nonce))
agent  <── ack(pairCode)      ─── cloud        (issued per WS connect)
```

Pair codes are single-use, base32, 10-min TTL. The same WebSocket then carries
`req`/`res` pairs for the lifetime of the connection.

### Event names (cloud → browser)

```
agent.connected     // a browser's bound agent is now online
agent.disconnected  // bound agent's socket closed
reader.opened       // connection.open succeeded on the agent
reader.closed       // connection.close / reader dropped
```

## Commands

The command set is a single discriminated union in `shared/protocol.ts` — both
browser and agent type-check against it.

### Global

| `cmd`               | Payload                            | Response                                  | Notes                                                                    |
| ------------------- | ---------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------ |
| `drivers.list`      | `{}`                               | `{ drivers: DriverInfo[] }`               | Called on every session to populate the driver dropdown.                 |
| `connection.open`   | `{ driver, ip, port, timeoutMs? }` | `{ driver, capabilities, deviceInfo }`    | Selects a driver, opens a device. `deviceInfo` shape is driver-specific. |
| `connection.close`  | `{}`                               | `{}`                                      | Closes the open device.                                                  |
| `connection.status` | `{}`                               | `{ open, driver?, capabilities?, info? }` | Cheap poll — does not open anything.                                     |

### Driver-scoped

These route through the active driver's `handlers` map. If the driver doesn't
implement a command the cloud returns `STAT_NOT_CAPABLE` (HTTP 501).

| `cmd`             | Capability      | Payload                          | Response                           |
| ----------------- | --------------- | -------------------------------- | ---------------------------------- |
| `connection.info` | `device_info`   | `{}`                             | Driver-specific device info object |
| `workmode.get`    | `work_mode`     | `{}`                             | `{ workMode: number }`             |
| `workmode.set`    | `work_mode`     | `{ workMode }`                   | `{}`                               |
| `remotenet.get`   | `remote_server` | `{}`                             | `RemoteNetInfo`                    |
| `remotenet.set`   | `remote_server` | `RemoteNetInfo`                  | `{}`                               |
| `whitelist.get`   | `whitelist`     | `{ timeoutMs? }`                 | `{ cards: string[] }` (hex EPCs)   |
| `whitelist.set`   | `whitelist`     | `{ cards: string[] }` (hex EPCs) | `{ uploaded: number }`             |

When adding new commands, add them to `CommandName`, `CommandPayloads`,
`CommandResponses` in `shared/protocol.ts` and both sides type-check
automatically. See [`docs/drivers.md`](./drivers.md).

## Capabilities

```ts
type Capability = "device_info" | "work_mode" | "remote_server" | "whitelist";
```

Each driver declares which capabilities it supports. `connection.open`'s
response surfaces them, and the browser's `FeatureNav` renders only the matching
tabs.

```ts
export interface DriverInfo {
  id: string; // "chafon-m200"
  name: string; // "Chafon M200 RFID Reader"
  description: string;
  capabilities: Capability[];
}
```

## Errors

```ts
interface ErrorBody {
  code: number; // vendor SDK STAT_* code, or 0xFFFFFExx for transport/auth
  statusName: string; // "STAT_CMD_TAG_NO_RESP", "STAT_BUSY", "STAT_TIMEOUT", ...
  httpStatus: number; // 400, 401, 410, 429, 501, 502, 504, ...
  message: string;
  traceId?: string;
}
```

Notable transport-layer codes (not from the vendor SDK):

| Code         | statusName            | HTTP | When                                                  |
| ------------ | --------------------- | ---- | ----------------------------------------------------- |
| `0xFFFFFE01` | `STAT_BUSY`           | 429  | Agent's in-flight queue full (`maxQueue`, default 16) |
| `0xFFFFFE02` | `STAT_TIMEOUT`        | 504  | Per-request 10s timeout hit                           |
| `0xFFFFFE03` | `STAT_NOT_PAIRED`     | 401  | `browserToken` invalid or expired                     |
| `0xFFFFFE04` | `STAT_NOT_OPEN`       | 409  | Driver command issued without `connection.open` first |
| `0xFFFFFE05` | `STAT_UNKNOWN_CMD`    | 400  | Command name not in the `CommandName` union           |
| `0xFFFFFE06` | `STAT_PROTO_VERSION`  | 426  | Agent vs cloud `protocolVersion` mismatch             |
| `0xFFFFFE07` | `STAT_AUTH_FAIL`      | 401  | Agent challenge-response verification failed          |
| `0xFFFFFE08` | `STAT_NOT_CAPABLE`    | 501  | Driver doesn't handle this command                    |
| `0xFFFFFF17` | `STAT_DLL_DISCONNECT` | 410  | `TRANSPORT_DISCONNECTED` — agent dropped mid-request  |

SDK `STAT_*` codes (error, comm, CRC, …) are in `shared/errors.ts` — the table
mirrors the vendor SDK's `CFApi.h`.

## Versioning

`protocolVersion` is a single integer in the `hello` envelope (currently `1`).
Bumped on any breaking change to envelope shape, command semantics, or
error-code meaning. The cloud rejects agents whose `protocolVersion` differs;
`chyi-cfg-agent update` is the remediation.

`agentVersion` in the same `hello` envelope is semantic — the cloud may log it
for fleet visibility but doesn't gate on it.

## Trace correlation

Every `req` carries a `traceId` the browser generates. Cloud's relay and the
agent's dispatcher both stamp it into their structured JSON logs. `res`/error
envelopes also carry it back, so "show the support team this traceId" is enough
to find the full request story across every tier.

```json
{
  "ts": "2026-04-18T...",
  "level": "info",
  "event": "cmd",
  "traceId": "abc123",
  "cmd": "whitelist.set",
  "ok": true,
  "ms": 842
}
```
