# Cloud Deploy

The cfg cloud (the public web app and the WebSocket relay) runs on Deno Deploy.
The agent binary lives separately on GitHub Releases — the cloud just redirects
to it.

- [Required env vars](#required-env-vars)
- [Initial setup](#initial-setup)
- [Build command](#build-command)
- [Routes served](#routes-served)
- [Releasing a new version](#releasing-a-new-version)
- [Single-region recommendation](#single-region-recommendation)

## Required env vars

| Variable            | Required   | Purpose                                                                                                           |
| ------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------- |
| `CFG_SERVER_SECRET` | yes (prod) | 32+ char HMAC secret for signing `browserToken`. Rotate by deploying a new value; existing sessions must re-pair. |

A dev-only fallback secret ships in `lib/live/token.ts`, so local runs work
without any env setup.

## Initial setup

1. Push to GitHub and connect the repo to a Deno Deploy project named `cfg`.
2. In the project settings:
   - **Entrypoint:** `_fresh/server.js` (the post-build artifact).
   - **Build Command:** `deno task build` — **nothing else**. Do not run
     `deno task agent:compile` in the cloud's build environment; see
     [Build command](#build-command) below for why.
3. Add `CFG_SERVER_SECRET` as a project env var (32+ random chars).
4. Trigger a deploy. The version it ships is whatever is in `agent/deno.json` at
   that commit.

Every push to `main` re-deploys automatically — no GitHub Actions are involved.

## Build command

**Use `deno task build`. Do NOT include `deno task agent:compile`.**

`deno task agent:compile` runs `deno compile --target x86_64-unknown-linux-gnu`,
which downloads a companion `denort` binary addressed by Deno's build SHA. Deno
Deploy's build images pin to specific SHAs; canary `denort` artifacts at
`dl.deno.land/canary/...` are GC'd regularly, and the pinned SHA goes 404 a few
days later. Even if that download succeeded, the resulting ~200MB binary is well
over Deno Deploy's function-bundle cap — it literally cannot ship with the
deploy. The binary belongs on GitHub Releases; the cloud redirects to it.

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

| Path            | Purpose                                                                                        |
| --------------- | ---------------------------------------------------------------------------------------------- |
| `/install.sh`   | Templated bash installer (version + URLs inlined from the serving deploy)                      |
| `/uninstall.sh` | Tiny wrapper that locates the local binary and runs `chyi-cfg-agent uninstall --yes`           |
| `/dist/{file}`  | Dev: serves `dist/chyi-cfg-agent` on disk. Prod: 302-redirects to the matching GitHub Release. |

## Releasing a new version

The cloud and the agent binary ship independently:

- **Cloud:** auto-deploys on every push to `main` (Deno Deploy).
- **Agent binary:** built + published by `.github/workflows/release.yml` on
  every `v*` tag push. The workflow runs `deno task check` + unit tests + the
  e2e smoke against a mock agent, compiles the binary, computes its SHA256, and
  publishes a GitHub Release titled `"chyi-cfg-agent v<ver> — Linux x86_64"`
  with two assets: the binary + `SHA256SUMS`.

### Cutting a release

```sh
# 1. Bump the version (single source of truth — flows into CLI, install.sh,
#    /api/live/health, and the GitHub tag derivation in routes/dist/[file].ts).
$EDITOR agent/deno.json                # set "version": "0.1.7"
git add agent/deno.json
git commit -m "bump to 0.1.7"
git push                               # Deno Deploy rebuilds + redeploys.

# 2. Tag it. The workflow guards against tag ≠ agent/deno.json mismatch.
git tag v0.1.7
git push --tags                        # Triggers release.yml.

# 3. ☕ Wait a few minutes. Done.
#    Release: https://github.com/chyi-io/cfg/releases/tag/v0.1.7
```

### How the SHA flows into install.sh

1. `release.yml` emits `dist/SHA256SUMS` with the line
   `<64-hex>  chyi-cfg-agent-<ver>-x86_64-linux` and uploads it to the Release.
2. On every request to `/install.sh`, `routes/install.sh.ts` calls
   `getBinSha256(version, assetName)` from `lib/live/release_sha.ts`, which
   fetches SHA256SUMS from the current version's GitHub Release (KV-cached: 24h
   on success, 5min on miss so a too-early fetch self-heals).
3. The real SHA is inlined as `BIN_SHA256=...` in the templated installer.
4. The client's `install.sh` runs `verify_sha` — if the real SHA is present, it
   enforces the checksum; if only the placeholder is there (dev hosts, or a
   release that hasn't finished uploading yet), it warns and continues.

### Updating clients

After the Release is live, `chyi-cfg-agent update` (or `curl … | bash`) on any
existing host sees `available: 0.1.7 > installed: 0.1.6`, stops the service,
swaps the binary, restarts. No manual intervention.

### Manual trigger

If you need to rebuild a release without re-tagging (e.g. a transient CI
failure), trigger the workflow from the GitHub Actions UI: **Actions → Release
chyi-cfg-agent → Run workflow → tag: `v0.1.7`**.

> **First release on a clean repo:** create the first Release _before_
> announcing the install URL. Until it exists, `/dist/{file}` redirects to a 404
> and `install.sh` aborts with "binary download failed".

## Single-region recommendation

Deno Deploy isolates can land in different regions. While `BroadcastChannel` +
Deno KV successfully route envelopes across isolates, latency compounds when the
agent's isolate is far from the browser's. **Pin the project to a single
region** close to where most agents will be installed — pairing feels noticeably
snappier.
