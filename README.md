# Chyi Hardware Configurator

A multi-vendor web application for uploading, editing, and generating IoT device
configuration files. Built with **Deno Fresh 2.x**, **Preact**, and **Tailwind
CSS v4**.

## Supported Vendors

| Vendor        | Devices                | File Format                        |
| ------------- | ---------------------- | ---------------------------------- |
| **Teltonika** | FMB Series, FMC Series | `.cfg` (gzip-compressed key:value) |
| **Ruptela**   | ECO5                   | `.rcfg` / `.txt` (INI-like)        |
| **Chafon**    | UHF Reader M-Series    | `.ini` (sectioned INI)             |

## Features

- **Auto-detection** — Upload any supported config file; vendor and device are
  detected automatically
- **URL-based routing** — Shareable URLs: `/config/teltonika/fmb`,
  `/config/chafon/m_series`
- **Zod validation** — Per-parameter type/range/enum validation with inline
  error feedback
- **Device compatibility** — Incompatible parameters shown as disabled, excluded
  from downloads
- **Search & filter** — Sidebar search across parameter names, IDs, and
  descriptions
- **Create from defaults** — Start a new config for any vendor/device with one
  click

## Two halves

cfg is split into two cleanly separated feature areas:

1. **File-based config editor** at `/` — upload, edit, and download static
   config files for the supported vendors. No device required, works fully
   offline in the browser.
2. **Live-device configuration** at `/live` — talk to real devices over the
   network through a small Linux agent installed on the LAN. The agent is
   **driver-pluggable**: it ships with a Chafon M200 RFID driver today; add new
   device families via the [drivers guide](docs/drivers.md).

End users install nothing — the device-side operator runs
`curl -fSL https://cfg.chyi.io/install.sh | bash` once. Native device libraries
are bundled inside the agent binary and auto-extracted on first run; there is no
separate driver download or manual file placement.

**Live-device docs:** [`architecture`](docs/live-architecture.md) ·
[`agent CLI`](docs/agent.md) · [`wire protocol`](docs/protocol.md) ·
[`writing a driver`](docs/drivers.md) · [`cloud deploy`](docs/deploy.md)

## Quick Start

```bash
# Full dev stack: cloud (port 8001, WS-capable) + vite (5173, SPA HMR) + mock agent
deno task dev

# Individual pieces
deno task dev:vite         # just vite (5173) — SPA iteration only, no WebSocket
deno task dev:agent        # just the agent, against the default cloud URL
deno task build            # production build (emits _fresh/client + _fresh/server)
deno task start            # serve the production build
deno task test             # all unit tests (no hardware needed)
deno task agent:compile    # compile dist/chyi-cfg-agent (single-binary, native libs embedded)
```

After `deno task dev`, visit `http://localhost:8001/live` (or `5173` — both work
thanks to the WS-port rewrite in `useAgentSocket`), paste the pair code from the
terminal, and you're on the dashboard.

For real hardware, drop an M200-capable binary on a Linux box on the reader's
LAN:

```bash
curl -fSL http://localhost:8001/install.sh | bash   # local dev cloud
curl -fSL https://cfg.chyi.io/install.sh | bash      # production
```

## Agent CLI (cheatsheet)

Installed via the one-liner above.

```bash
chyi-cfg-agent                 # help
chyi-cfg-agent doctor          # preflight (FFI + cloud + glibc)
chyi-cfg-agent status          # version, agentId, cloud URL, drivers
chyi-cfg-agent pair            # fresh pair code for another browser
chyi-cfg-agent update          # in-place update (stop → swap → restart)
chyi-cfg-agent uninstall       # full cleanup
```

Full reference and flags: [`docs/agent.md`](docs/agent.md).

## API Routes

File editor:

| Method | Path                            | Description                                 |
| ------ | ------------------------------- | ------------------------------------------- |
| `GET`  | `/api/vendors`                  | List all registered vendors and devices     |
| `GET`  | `/api/defaults?vendor=&device=` | Get default config for a device             |
| `POST` | `/api/upload`                   | Upload and auto-detect a config file        |
| `POST` | `/api/download`                 | Validate and generate a downloadable config |

Live device:

| Method | Path               | Description                                        |
| ------ | ------------------ | -------------------------------------------------- |
| `GET`  | `/api/live/health` | Cloud liveness + version + protocol version        |
| `POST` | `/api/live/pair`   | Consume pair code → return browser token           |
| `WS`   | `/api/live/ws`     | Browser ↔ cloud relay (token in query string)      |
| `WS`   | `/api/agent/ws`    | Agent ↔ cloud relay (HMAC challenge auth)          |
| `GET`  | `/install.sh`      | Templated bash installer (version + URLs inlined)  |
| `GET`  | `/uninstall.sh`    | Wrapper that runs `chyi-cfg-agent uninstall --yes` |
| `GET`  | `/dist/{file}`     | Serves the compiled agent binary for the installer |

## Project Structure

```
cfg/
├── main.ts                          # App entry — registers file-editor vendors
├── agent/deno.json                  # Single source of truth for version (imported by shared/version.ts)
│
├── routes/                          # Fresh file-based routing
│   ├── index.tsx                    # Landing page (mode picker)
│   ├── config/                      # File-editor routes
│   ├── live/                        # Live-device routes
│   │   ├── index.tsx                # Pair entry + install snippet
│   │   ├── [agent].tsx              # Per-agent dashboard
│   │   └── [agent]/                 # work_mode.tsx, remote_server.tsx, whitelist.tsx
│   ├── api/
│   │   ├── live/{ws,pair,health}.ts # Browser-facing endpoints
│   │   └── agent/ws.ts              # Agent-facing WebSocket
│   ├── dist/[file].ts               # Serves compiled agent binary
│   ├── static/native.tgz.ts         # (legacy) native-libs tarball
│   ├── install.sh.ts                # Templated bash installer
│   └── uninstall.sh.ts              # Uninstaller wrapper
│
├── islands/
│   ├── HomePage.tsx                 # File editor landing
│   ├── ConfigEditor.tsx             # File editor
│   └── live/
│       ├── useAgentSocket.ts        # WS hook (reconnect, req/res, events)
│       ├── PairForm.tsx
│       ├── AgentDashboard.tsx       # Connect form + device info
│       ├── AgentStatusBanner.tsx
│       ├── WorkModeEditor.tsx
│       ├── RemoteServerEditor.tsx
│       └── WhitelistEditor.tsx      # CSV import/export + diff dialog
│
├── components/                      # Pure Preact components (SSR + client)
│   └── live/{Toast,FeatureNav,InstallSnippet,…}.tsx
│
├── lib/
│   ├── http.ts  registry.ts  validation.ts   # File-editor side
│   └── live/
│       ├── relay.ts                 # Socket registry + BroadcastChannel bridge
│       ├── pair_store.ts            # Deno KV — pair codes, tokens
│       ├── token.ts                 # HMAC sign/verify for browserToken
│       └── rate_limit.ts
│
├── shared/                          # Imported by BOTH cloud and agent
│   ├── protocol.ts                  # Wire envelope + command union (source of truth)
│   ├── capabilities.ts              # Capability enum + DriverInfo
│   ├── types.ts                     # Cross-tier data types
│   ├── errors.ts                    # STAT_* table + ErrorBody
│   ├── pair.ts                      # Pair-code + HMAC helpers
│   ├── validate.ts                  # Small assertion helpers
│   └── version.ts                   # Reads agent/deno.json → VERSION
│
├── vendors/                         # File-editor vendor plugins
│   ├── teltonika/  ruptela/  chafon/
│
├── agent/                           # The Linux agent (separate binary)
│   ├── deno.json                    # VERSION + tasks
│   ├── main.ts                      # CLI entry (run, pair, doctor, update, uninstall, …)
│   ├── bootstrap.ts                 # LD_LIBRARY_PATH re-exec + lib extraction
│   ├── dispatcher.ts                # Command routing through active driver
│   ├── ws_client.ts                 # Outbound WS with reconnect backoff
│   ├── lifecycle.ts                 # CLI command implementations
│   ├── config.ts                    # Persistent config.json (agentId, agentKey, URL)
│   ├── embedded_libs.ts             # Extract driver native libs from the binary
│   ├── log.ts  term.ts              # Structured JSON logs + ANSI
│   ├── systemd/chyi-cfg-agent.service  # Hardened user unit template
│   ├── tests/{structs,dispatcher}_test.ts
│   └── drivers/
│       ├── types.ts  registry.ts  index.ts
│       └── chafon-m200/             # Reference driver (folder name = driver id)
│           ├── index.ts  reader.ts  mock_reader.ts  structs.ts  lib.ts
│           └── native/              # .so files bundled into the binary
│
├── scripts/
│   ├── dev_all.ts                   # Spawns cloud + vite + agent (the dev task)
│   ├── dev_serve.ts                 # Standalone cloud helper
│   └── smoke_e2e.ts                 # End-to-end live-device smoke
│
├── tests/                           # File-editor tests
└── docs/
    ├── live-architecture.md  agent.md  protocol.md  drivers.md  deploy.md
    └── (file-editor docs: architecture.md, add-vendor.md, …)
```

## Documentation

Full documentation is hosted at [`/docs`](/docs) when the app is running. It
includes:

| Guide                                    | Description                                       |
| ---------------------------------------- | ------------------------------------------------- |
| [Getting Started](/docs/getting-started) | Installation, tasks, tech stack                   |
| [Architecture](/docs/architecture)       | Plugin system, data flow, component tree          |
| [Adding a Vendor](/docs/add-vendor)      | Step-by-step guide with code examples             |
| [Adding a Device](/docs/add-device)      | Adding a device variant to an existing vendor     |
| [API Reference](/docs/api-reference)     | All REST endpoints with request/response examples |
| [File Formats](/docs/file-formats)       | Detailed format specs for each vendor             |
| [UI Components](/docs/ui-components)     | Islands, components, shared types                 |
| [Testing](/docs/testing)                 | Test runner, conventions, fixtures                |
