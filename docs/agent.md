# chyi-cfg-agent

A small Linux daemon that bridges the cfg cloud UI to a device on a local
network. The agent is **driver-pluggable** — it ships with a Chafon M200 RFID
driver today; new device families plug in via the [drivers guide](./drivers.md).

- [Install](#install)
- [Update](#update)
- [Uninstall](#uninstall)
- [Commands](#commands)
- [Configuration](#configuration)
- [Service management](#service-management)
- [Pairing](#pairing)
- [Multi-driver](#multi-driver)
- [Troubleshooting](#troubleshooting)

## Install

```sh
curl -fSL https://cfg.chyi.io/install.sh | bash
```

The one-liner:

1. Checks glibc and aborts cleanly if too old (needs ≥ 2.35).
2. Downloads a single `chyi-cfg-agent` binary via `curl -fSL` (the cloud
   302-redirects `/dist/...` to the matching GitHub Release asset — `curl`
   follows it transparently) and verifies SHA256 + minisign (in production).
3. Seeds `~/.config/chyi-cfg-agent/config.json` with the cloud URL so ad-hoc CLI
   calls (`doctor`, `status`, `pair`) work out of the box.
4. Installs a hardened systemd **user** unit at
   `~/.config/systemd/user/chyi-cfg-agent.service`.
5. Starts the service and prints the first pair code.

> **No separate native-libs download.** Each driver's `.so` files are bundled
> _into_ the agent binary via `deno compile --include drivers` and
> auto-extracted to a cache dir on first run. There is nothing to upload, tar
> up, or place by hand.

## Update

```sh
# Cloud-side: push a new version (bumps agent/deno.json → rebuild → deploy).

# Client-side: either of these works from any host with the agent installed:
chyi-cfg-agent update                 # semver-check, stop, swap, restart
curl -fSL https://cfg.chyi.io/install.sh | bash   # same, via the installer directly
```

The installer detects an existing install and:

- Prints `already up to date` and exits `0` if the installed version matches.
- Prints `upgrading X → Y`, stops the service, swaps the binary, restarts the
  service.
- Refuses a downgrade unless you pass `--force`.

Useful flags:

- `--force` — reinstall even if up-to-date, or allow a downgrade.
- `--no-start` — write the binary + unit but don't touch the running service.

## Uninstall

```sh
curl -fSL https://cfg.chyi.io/uninstall.sh | bash   # non-interactive wrapper
chyi-cfg-agent uninstall                            # interactive
chyi-cfg-agent uninstall --yes                      # skip the [y/N] prompt
```

The uninstaller stops + disables the systemd unit, then removes:

- `~/.local/share/chyi-cfg-agent/` (binary + extracted native libs)
- `~/.local/bin/chyi-cfg-agent` (symlink)
- `~/.config/systemd/user/chyi-cfg-agent.service`
- `~/.cache/chyi-cfg-agent/` (native-libs cache)
- `~/.config/chyi-cfg-agent/config.json` (agent identity)

All previously-issued browser tokens reference an `agentId` that no longer
exists — every browser must re-pair from `/live` after a fresh install.

## Commands

```
chyi-cfg-agent run        (default, systemd runs this) connect + dispatch device commands
chyi-cfg-agent pair       one-shot: connect, get a fresh pair code, exit
chyi-cfg-agent status     version, agentId, cloud URL, config path, FFI mode, driver list
chyi-cfg-agent doctor     preflight checks (FFI, cloud reachability, glibc)
chyi-cfg-agent logs       follow the systemd journal for this unit
chyi-cfg-agent setup      interactive first-time setup (cloud URL + identity + doctor)
chyi-cfg-agent update     in-place update to the latest cloud version
chyi-cfg-agent reset      rotate local identity (orphans browser tokens)
chyi-cfg-agent uninstall  full cleanup (--yes to skip prompt)
chyi-cfg-agent version    print version and exit
chyi-cfg-agent help       full help with examples
```

`chyi-cfg-agent help` is the canonical reference — it prints the same list with
all flags, env vars, and worked examples.

## Configuration

The agent reads each variable once on startup and persists the derived values
into `~/.config/chyi-cfg-agent/config.json`. After that, the persisted file is
the source of truth (env vars override on subsequent starts only if they differ
from the persisted value).

| Variable                  | Default                          | Purpose                                                                                                                     |
| ------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `CHYI_CFG_URL`            | `wss://cfg.chyi.io/api/agent/ws` | Cloud agent endpoint                                                                                                        |
| `CHYI_CFG_AGENT_HOME`     | `~/.config/chyi-cfg-agent`       | Config + state directory                                                                                                    |
| `CHYI_CFG_LOG_LEVEL`      | `info`                           | `debug`, `info`, `warn`, `error`                                                                                            |
| `CHYI_CFG_FFI`            | _unset_                          | Set to `mock` to use the in-memory mock reader (dev only)                                                                   |
| `CHYI_CFG_AGENT_LIB_PATH` | _unset_                          | **Override only.** Absolute path to `libCFApi.so`. Not normally needed — driver native libs are bundled and auto-extracted. |
| `NO_COLOR`                | _unset_                          | Disable ANSI colors in CLI output                                                                                           |

`agentId` + `agentKey` are generated on first run and stored at 0600.
`chyi-cfg-agent reset` regenerates them (after a `[y/N]` prompt).

## Service management

```sh
systemctl --user status chyi-cfg-agent
systemctl --user restart chyi-cfg-agent
chyi-cfg-agent logs        # same as: journalctl --user -u chyi-cfg-agent -f
```

The agent refuses to run in the foreground if the systemd service is already
active, to prevent two agents sharing an `agentId` and kicking each other from
the cloud:

```
$ chyi-cfg-agent run
✗ chyi-cfg-agent.service is already running under systemd.
  Two agents with the same agentId fight over the cloud connection;
  browsers then get stuck on 'connecting...'. Stop the service first:
    systemctl --user stop chyi-cfg-agent.service
```

Use `chyi-cfg-agent run --force` to override (not recommended — pairing becomes
unstable).

## Pairing

Each time the agent establishes its cloud WebSocket, the cloud issues a
single-use 8-char base32 pair code (10-min TTL). On first connect the agent
logs:

```
chyi-cfg-agent ready — pair at https://cfg.chyi.io/live with code AB12-CD34
```

Paste the code at `https://cfg.chyi.io/live`. The browser receives a 24h
HMAC-signed `browserToken` in `localStorage`.

Need another browser? Run `chyi-cfg-agent pair` — it opens a throwaway WS, asks
the cloud for a fresh code, prints it, exits. Does not disturb the running
systemd service.

To revoke every browser token: `chyi-cfg-agent reset` regenerates the agent
identity so all existing tokens become orphans. A fresh pair is required after
that.

## Multi-driver

`chyi-cfg-agent status` prints the drivers compiled into your binary. Today:

```
$ chyi-cfg-agent status
  version     0.1.5
  agentId     ...
  ffi         native
  drivers     chafon-m200
```

The cloud UI's **Connect** form discovers drivers at runtime via the
`drivers.list` command and renders a dropdown. Feature tabs (work mode, remote
server, whitelist, …) are gated by each driver's `capabilities` array — only
tabs the connected device supports appear.

**Native libs are bundled per driver.** Each driver declares its required `.so`
files in `Driver.nativeLibs`, and `deno compile --include drivers` embeds them
into the single agent binary. On first run the agent extracts them under
`<cache>/<driver-id>/` and adjusts `LD_LIBRARY_PATH` automatically — no per-host
setup.

Adding a new driver = adding a folder with `index.ts` + `native/` + registering
it; the next agent build ships those libs everywhere. See
[`docs/drivers.md`](./drivers.md).

## Troubleshooting

Run `chyi-cfg-agent doctor` first — it dlopens each driver's `.so`, resolves
every symbol, hits the cloud's `/api/live/health` (and reports the cloud's
version + protocol version), and checks glibc. Every check has a remediation
hint if it fails.

Common failures:

| Symptom                                          | Cause                               | Fix                                                                                                    |
| ------------------------------------------------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `dlopen failed … cannot open shared object file` | cache dir not writable              | `chmod u+w ~/.cache/chyi-cfg-agent` or set `$CHYI_CFG_AGENT_HOME`                                      |
| `cloud reachable ✗ — dns error`                  | `CHYI_CFG_URL` unreachable          | `cat ~/.config/chyi-cfg-agent/config.json` — verify the URL                                            |
| Browser stuck on "Connecting…"                   | Two agents share the same `agentId` | `systemctl --user status chyi-cfg-agent`, kill any extra `chyi-cfg-agent run` foreground processes     |
| `Protocol version mismatch`                      | Agent older than cloud              | `chyi-cfg-agent update`                                                                                |
| Pair code never appears                          | WS handshake failed                 | `chyi-cfg-agent logs` — look for `ws.error`, `ws.register_failed`                                      |
| `dlopen` looks for `libhid.so`                   | loader can't find the sibling       | Should never happen — agent re-execs itself with `LD_LIBRARY_PATH`. Run under `strace` and file a bug. |

For anything else, `chyi-cfg-agent logs` (or
`journalctl --user -u chyi-cfg-agent -n 100`) is your friend. Every request
carries a `traceId` stamped into both agent and cloud logs for
cross-correlation.
