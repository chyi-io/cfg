# Cloud Deploy

The cfg cloud (the public web app and the WebSocket relay) runs on Deno Deploy.

- [Required env vars](#required-env-vars)
- [Initial setup](#initial-setup)
- [Routes served](#routes-served)
- [Build pipeline](#build-pipeline)
- [Single-region recommendation](#single-region-recommendation)

## Required env vars

| Variable            | Required   | Purpose                                                                                                           |
| ------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------- |
| `CFG_SERVER_SECRET` | yes (prod) | 32+ char HMAC secret for signing `browserToken`. Rotate by deploying a new value; existing sessions must re-pair. |

A dev-only fallback secret ships in `lib/live/token.ts`, so local runs work
without any env setup.

## Initial setup

1. Push to GitHub and connect the repo to a Deno Deploy project.
2. In the project settings:
   - **Entrypoint:** `_fresh/server.js` (post-build artifact).
   - **Build step:** `deno task build` (runs Vite, emits `_fresh/client` +
     `_fresh/server`).
3. Add `CFG_SERVER_SECRET` as a project env var (32+ random chars).
4. Trigger a deploy. The version it ships is whatever is in `agent/deno.json` at
   that commit.

The agent binary for that version is expected to be available at
`/dist/chyi-cfg-agent-<version>-x86_64-linux`. The release pipeline (see
`.github/workflows/release.yml`) builds it and uploads it to GitHub Releases;
the cloud's `/dist/{file}` route serves it from there (or from a local `dist/`
dir in local dev).

## Routes served

### Public web app

| Path                        | Purpose                                                   |
| --------------------------- | --------------------------------------------------------- |
| `/`                         | File-based config editor (unrelated to live mode)         |
| `/live`                     | Pair entry + install snippet                              |
| `/live/{agentId}`           | Per-agent dashboard (device info, connect form)           |
| `/live/{agentId}/{feature}` | Feature pages (`work_mode`, `remote_server`, `whitelist`) |

### Agent / browser APIs

| Method | Path                   | Purpose                                              |
| ------ | ---------------------- | ---------------------------------------------------- |
| `GET`  | `/api/live/health`     | Liveness + cloud `version` + `protocolVersion`       |
| `POST` | `/api/live/pair`       | Consume pair code → issue HMAC-signed `browserToken` |
| `WS`   | `/api/live/ws?token=…` | Browser ↔ cloud relay                                |
| `WS`   | `/api/agent/ws`        | Agent ↔ cloud relay (HMAC challenge auth)            |

### Installer / distribution

| Path            | Purpose                                                                              |
| --------------- | ------------------------------------------------------------------------------------ |
| `/install.sh`   | Templated bash installer (version + URLs inlined from the serving deploy)            |
| `/uninstall.sh` | Tiny wrapper that locates the local binary and runs `chyi-cfg-agent uninstall --yes` |
| `/dist/{file}`  | Serves `chyi-cfg-agent` binaries (local `dist/` in dev, GitHub Release in prod)      |

## Build pipeline

Bumping a release is one edit:

```jsonc
// agent/deno.json
{ "version": "0.2.0", … }
```

`shared/version.ts` imports this JSON, so the same value flows into:

- `chyi-cfg-agent version` (agent CLI)
- `/api/live/health`'s `version` field
- The `AGENT_VERSION` variable templated into `/install.sh`
- `chyi-cfg-agent status` output
- The SSR-rendered HTML footer (if added)

On tag push (`v*`), `.github/workflows/release.yml`:

1. Runs `deno task check` + unit tests.
2. Compiles the agent binary (`deno task agent:compile` →
   `dist/chyi-cfg-agent`).
3. Uploads `chyi-cfg-agent` + `SHA256SUMS` to a GitHub Release.
4. Deploys the cloud via `denoland/deployctl`.

Clients running an old version see `upgrading X → Y` the next time they run
`chyi-cfg-agent update` (or anyone re-runs the `install.sh` one-liner on that
host).

## Single-region recommendation

Deno Deploy isolates can land in different regions. While `BroadcastChannel` +
Deno KV successfully route envelopes across isolates, latency compounds when the
agent's isolate is far from the browser's. **Pin the project to a single
region** close to where most agents will be installed — pairing feels noticeably
snappier.
