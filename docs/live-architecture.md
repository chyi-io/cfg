# Live-Device Architecture

```
[Browser SPA]  <-- WSS -->  [cfg on Deno Deploy]  <-- WSS -->  [Agent on LAN]  <-- driver -->  [Device]
               browserToken               agentId               (FFI, TCP, ...)
                              BroadcastChannel + Deno KV
```

## Why three pieces

- **Cloud SPA** gives end users a public URL with no install on their devices.
- **Agent on LAN** is the only thing that can reach the device: browsers can't
  open raw TCP, and a cloud-hosted server can't route into a private LAN.
- **WSS relay in the cloud** pairs them: the agent opens an outbound WebSocket
  (firewall-friendly), the browser opens a same-origin WebSocket, and cfg routes
  envelopes between them.

## Drivers

The agent is **multi-driver**. Each driver knows how to talk to one family of
devices (Chafon M200 RFID readers today; future scales, barcode readers, etc.).
Drivers declare:

- An `id` (e.g. `chafon-m200`) that the browser uses when opening a connection.
- A list of `capabilities` (`device_info`, `work_mode`, `remote_server`,
  `whitelist`, ...). The cloud UI's nav reflects these — feature tabs only
  appear if the connected device's driver supports them.
- A typed `handlers` map keyed by command name. The dispatcher routes per-driver
  and surfaces a clear "not supported" error if a handler is missing.
- An optional `nativeLibs: string[]` listing `.so` files the driver needs at
  runtime.

**Native libs are bundled into the binary** via
`deno compile --include drivers`. On first run the agent extracts each driver's
libs to `<cache>/<driver-id>/` and prepends those directories to
`LD_LIBRARY_PATH` via a self-re-exec — so the dynamic loader resolves dependent
libraries (like `libhid.so` for the Chafon driver) without any per-host setup.
Adding a new driver ships its libs to every host on the next release.

See [`docs/drivers.md`](./drivers.md) for how to author a new driver.

## Pairing

1. The agent generates a persistent `agentId` (UUID at
   `~/.config/chyi-cfg-agent/config.json`) and an `agentKey` on first run.
2. On WS connect, agent sends
   `{kind: "hello", agentId, agentVersion, protocolVersion}`.
3. Cloud responds with `{kind: "challenge", nonce}`.
4. Agent replies with `{kind: "challenge_response", agentId, sig}` where
   `sig = HMAC(agentKey, nonce)`.
5. Cloud verifies (TOFU on first sighting); on success issues
   `{kind: "ack", pairCode, pairCodeExpiresAt}` — the code is single-use,
   base32, 10-min TTL.
6. User enters the code at `/live`; cloud returns an HMAC-signed `browserToken`
   (24h).
7. Browser opens `wss://.../api/live/ws?token=...`; the cloud relay binds the
   browser socket to the agent's `agentId`.

## Command lifecycle

```
browser    ──req──>   cloud     ──req──>    agent
                      relay                  Dispatcher
                                             driver.handlers[cmd]
                                             device call
browser   <──res──    cloud    <──res──     agent
```

Per-request `traceId` is generated browser-side, propagates through cloud and
agent logs, and is returned in error envelopes for support diagnosis. Default
request timeout 10s. Agent rejects with `BUSY` if its in-flight queue exceeds
`maxQueue` (default 16).

`drivers.list` is a global command (not per-driver). `connection.open` selects a
driver by id and stashes the resulting Device on the dispatcher's session. All
other commands route through the active driver's `handlers`. If a driver doesn't
implement a command, the cloud returns `STAT_NOT_CAPABLE` (HTTP 501).

## Deno Deploy isolates

Two browsers and one agent may land in different isolates. Each isolate keeps a
local `Map<agentId, WebSocket>`. When the isolate handling a browser doesn't
have the agent socket locally, it posts the envelope on a `BroadcastChannel`
named `agent:<agentId>`; the isolate that does own the agent socket forwards it.
Pairing state (codes, tokens) lives in Deno KV so any isolate can validate.

## Failure modes

- **Agent disconnect** → cloud emits `event: "agent.disconnected"` to all bound
  browsers; pending requests reject with `TRANSPORT_DISCONNECTED`. Agent
  reconnects with exponential backoff (1s → 30s cap, jitter), re-registers with
  the same `agentId`, and existing browser tokens auto-rebind.
- **Browser disconnect** → handle disposed; in-flight requests on that socket
  are abandoned (the agent may still complete the underlying call but the
  response is dropped). Per-driver mutexes (where present) keep the device in a
  consistent state.
- **Cloud restart / isolate recycle** → agent reconnects automatically; browsers
  reconnect via `useAgentSocket` reconnect loop. Tokens survive (HMAC-signed,
  not stored in process state).

## Security boundaries

- **agentKey** never leaves the agent host; the cloud only ever sees signatures.
- **browserToken** HMAC-signed with a server secret (env `CFG_SERVER_SECRET`).
  Tokens are bound to a specific `agentId` and have an `exp` claim; revocable by
  clearing the agent's tokens entry in KV (or rotating the agent identity via
  `chyi-cfg-agent reset`).
- **Pair code** is rate-limited per source IP (5 attempts / 15 min via Deno KV
  counters), single-use, 10-min TTL.
- **Origin** check on the browser-facing WS rejects upgrades from foreign
  origins.
- **No third-party scripts** in the `/live` route tree.
