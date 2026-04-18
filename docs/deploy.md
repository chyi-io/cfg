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

The cloud and the agent binary ship independently. The cloud auto-deploys on
push; the binary is a manual `gh release` per version bump.

```sh
# 1. Bump the version (single source of truth — flows into CLI, install.sh,
#    /api/live/health, and the GitHub tag derivation in routes/dist/[file].ts).
$EDITOR agent/deno.json                # set "version": "0.1.6"
git add agent/deno.json
git commit -m "bump to 0.1.6"
git push                               # Deno Deploy rebuilds + redeploys the cloud.

# 2. Build the agent binary locally.
deno task agent:compile                # produces dist/chyi-cfg-agent

# 3. Publish a GitHub Release with the binary named for the installer URL.
#    routes/dist/[file].ts redirects `/dist/chyi-cfg-agent-<ver>-x86_64-linux`
#    to `releases/download/v<ver>/chyi-cfg-agent-<ver>-x86_64-linux`.
gh release create v0.1.6 \
  "dist/chyi-cfg-agent#chyi-cfg-agent-0.1.6-x86_64-linux" \
  --title "v0.1.6" --generate-notes
```

After step 3, every host running `chyi-cfg-agent update` (or re-running the
install one-liner) pulls the new binary transparently — `curl -fSL` in
`install.sh` follows the 302 from the cloud to the GitHub Release.

> **First time on a clean repo?** Until the very first GitHub Release exists,
> `/dist/{file}` in production will redirect to a URL that 404s. `install.sh`
> will report `HTTP 404` and abort. Create a Release for the current version
> before announcing the URL.

## Single-region recommendation

Deno Deploy isolates can land in different regions. While `BroadcastChannel` +
Deno KV successfully route envelopes across isolates, latency compounds when the
agent's isolate is far from the browser's. **Pin the project to a single
region** close to where most agents will be installed — pairing feels noticeably
snappier.
