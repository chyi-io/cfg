import { define } from "../utils.ts";
import { version } from "../shared/version.ts";
import { getBinSha256 } from "../lib/live/release_sha.ts";

const TEMPLATE = `#!/usr/bin/env bash
# chyi-cfg-agent installer / updater
#
# Re-running this script on a host with chyi-cfg-agent already installed
# triggers an UPDATE: it compares the running version against this script's
# bundled version (semver), skips if up-to-date, and prompts before downgrades.
#
# Flags:
#   --force      replace the binary even if up-to-date / would be a downgrade
#   --no-start   install the binary + unit but don't start the service

set -euo pipefail

CFG_SCHEME="__CFG_SCHEME__"
CFG_WS_SCHEME="__CFG_WS_SCHEME__"
CFG_HOST="__CFG_HOST__"
AGENT_VERSION="__AGENT_VERSION__"
BIN_URL="__BIN_URL__"
BIN_SHA256="__BIN_SHA256__"

INSTALL_DIR="\${CHYI_CFG_AGENT_HOME:-$HOME/.local/share/chyi-cfg-agent}"
BIN_DIR="$HOME/.local/bin"
UNIT_PATH="$HOME/.config/systemd/user/chyi-cfg-agent.service"
INSTALLED_BIN="$INSTALL_DIR/chyi-cfg-agent"

FORCE=0
NO_START=0
for arg in "$@"; do
  case "$arg" in
    --force) FORCE=1 ;;
    --no-start) NO_START=1 ;;
    -h|--help)
      echo "Usage: $0 [--force] [--no-start]"
      exit 0
      ;;
  esac
done

err() { echo "ERROR: $*" >&2; exit 1; }
log() { echo "  → $*"; }

[[ "$(uname -s)" == "Linux" ]] || err "chyi-cfg-agent currently supports Linux only."
command -v curl >/dev/null || err "curl required"
command -v sha256sum >/dev/null || err "sha256sum required"
command -v sort >/dev/null || err "sort required"

# Detect glibc and warn if too old.
if command -v ldd >/dev/null; then
  GLIBC=$(ldd --version 2>&1 | head -1 | grep -oE '[0-9]+\\.[0-9]+' | head -1)
  log "glibc detected: \${GLIBC:-unknown}"
fi

# semver_cmp A B
#   prints "lt" "eq" or "gt" depending on A relative to B
#   uses sort -V (version sort), which handles X.Y.Z reliably for our use
semver_cmp() {
  local a="$1" b="$2"
  if [[ "$a" == "$b" ]]; then echo "eq"; return; fi
  local newest
  newest=$(printf "%s\\n%s\\n" "$a" "$b" | sort -V | tail -1)
  if [[ "$newest" == "$a" ]]; then echo "gt"; else echo "lt"; fi
}

# If a binary is already installed, do an update-aware decision.
INSTALLED_VERSION=""
if [[ -x "$INSTALLED_BIN" ]]; then
  INSTALLED_VERSION=$("$INSTALLED_BIN" version 2>/dev/null | head -1 | tr -d '[:space:]' || true)
fi

if [[ -n "$INSTALLED_VERSION" ]]; then
  log "currently installed: $INSTALLED_VERSION"
  log "available:           $AGENT_VERSION"
  CMP=$(semver_cmp "$AGENT_VERSION" "$INSTALLED_VERSION")
  case "$CMP" in
    eq)
      if [[ "$FORCE" == "1" ]]; then
        log "same version — reinstalling because of --force"
      else
        log "already up to date. (re-run with --force to reinstall)"
        exit 0
      fi
      ;;
    gt)
      log "upgrading $INSTALLED_VERSION → $AGENT_VERSION"
      ;;
    lt)
      if [[ "$FORCE" == "1" ]]; then
        log "WARNING: downgrading $INSTALLED_VERSION → $AGENT_VERSION (--force)"
      else
        err "downgrade refused: installed $INSTALLED_VERSION > available $AGENT_VERSION (re-run with --force to override)"
      fi
      ;;
  esac
else
  log "installing chyi-cfg-agent $AGENT_VERSION"
fi

log "(driver native libs are bundled inside the binary — no separate download)"

mkdir -p "$INSTALL_DIR" "$BIN_DIR" "$(dirname "$UNIT_PATH")"

verify_sha() {
  local expected="$1" file="$2" label="$3"
  case "$expected" in
    SHA256_PLACEHOLDER*|"")
      log "WARNING: $label sha256 not pinned — skipping verification (development build)"
      return 0
      ;;
  esac
  echo "$expected  $file" | sha256sum -c - >/dev/null || err "$label checksum mismatch"
}

# If the service is running, stop it before swapping the binary.
SERVICE_WAS_RUNNING=0
if [[ -n "$INSTALLED_VERSION" ]] && command -v systemctl >/dev/null; then
  if systemctl --user is-active --quiet chyi-cfg-agent.service 2>/dev/null; then
    log "stopping running service for atomic swap"
    systemctl --user stop chyi-cfg-agent.service || true
    SERVICE_WAS_RUNNING=1
  fi
fi

log "downloading $BIN_URL"
TMP=$(mktemp -d); trap "rm -rf $TMP" EXIT
curl -fSL "$BIN_URL" -o "$TMP/chyi-cfg-agent"
verify_sha "$BIN_SHA256" "$TMP/chyi-cfg-agent" "binary"
chmod +x "$TMP/chyi-cfg-agent"
mv "$TMP/chyi-cfg-agent" "$INSTALL_DIR/chyi-cfg-agent"
ln -sf "$INSTALL_DIR/chyi-cfg-agent" "$BIN_DIR/chyi-cfg-agent"

log "writing systemd unit at $UNIT_PATH"
cat > "$UNIT_PATH" <<EOF
[Unit]
Description=chyi-cfg-agent (Chafon M200 live configuration)
After=network-online.target

[Service]
ExecStart=$INSTALL_DIR/chyi-cfg-agent run
Restart=on-failure
RestartSec=5
# CHYI_CFG_URL only sets the *initial* URL on first run; thereafter the
# persisted config.json (\${HOME}/.config/chyi-cfg-agent/config.json) is the
# source of truth and the env var is ignored unless changed deliberately.
Environment=CHYI_CFG_URL=$CFG_WS_SCHEME://$CFG_HOST/api/agent/ws
Environment=CHYI_CFG_LOG_LEVEL=info
# We deliberately do NOT set CHYI_CFG_AGENT_HOME — it would redirect the
# config dir away from \${HOME}/.config/chyi-cfg-agent, which would mean
# ad-hoc CLI calls (chyi-cfg-agent doctor, status) without the env var would
# read a different config than the systemd-run agent. Letting it default to
# \${HOME}/.config/chyi-cfg-agent keeps both views in sync.
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=$INSTALL_DIR \${HOME}/.config/chyi-cfg-agent \${HOME}/.cache/chyi-cfg-agent

[Install]
WantedBy=default.target
EOF

# Seed config.json with the cloud URL so ad-hoc CLI commands (doctor, status,
# pair) work without needing CHYI_CFG_URL set in the user's shell. The agent
# fills in agentId + agentKey on its first run; cloudUrl is the only field we
# need to pre-populate.
CONFIG_DIR="$HOME/.config/chyi-cfg-agent"
CONFIG_FILE="$CONFIG_DIR/config.json"
mkdir -p "$CONFIG_DIR"
if [[ -f "$CONFIG_FILE" ]]; then
  log "config.json exists — keeping existing identity, updating cloudUrl"
  # Best-effort sed update of the cloudUrl field. If jq is available, use it.
  if command -v jq >/dev/null; then
    jq --arg url "$CFG_WS_SCHEME://$CFG_HOST/api/agent/ws" \
      '.cloudUrl = $url' "$CONFIG_FILE" > "$CONFIG_FILE.tmp" && mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"
  else
    sed -i -E 's|("cloudUrl"[[:space:]]*:[[:space:]]*")[^"]*(")|\\1'"$CFG_WS_SCHEME://$CFG_HOST/api/agent/ws"'\\2|' "$CONFIG_FILE"
  fi
else
  log "seeding $CONFIG_FILE"
  cat > "$CONFIG_FILE" <<EOF
{
  "cloudUrl": "$CFG_WS_SCHEME://$CFG_HOST/api/agent/ws"
}
EOF
fi
chmod 600 "$CONFIG_FILE"

systemctl --user daemon-reload

if [[ "$NO_START" == "1" ]]; then
  log "--no-start: not starting the service"
  log "to start manually:  systemctl --user enable --now chyi-cfg-agent.service"
  exit 0
fi

if [[ -n "$INSTALLED_VERSION" ]]; then
  systemctl --user enable chyi-cfg-agent.service >/dev/null 2>&1 || true
  systemctl --user restart chyi-cfg-agent.service
  log "service restarted on $AGENT_VERSION"
  exit 0
fi

systemctl --user enable --now chyi-cfg-agent.service

log "waiting for pair code (up to 15s)..."
for i in $(seq 1 30); do
  CODE=$(journalctl --user -u chyi-cfg-agent --since "30 seconds ago" -o cat 2>/dev/null | grep -oE 'code [A-Z0-9-]+' | tail -1 || true)
  [[ -n "$CODE" ]] && break
  sleep 0.5
done

if [[ -z "\${CODE:-}" ]]; then
  echo
  echo "Could not read pair code from journalctl. Run:"
  echo "  chyi-cfg-agent doctor"
  echo "  journalctl --user -u chyi-cfg-agent -n 50"
  exit 1
fi

echo
echo "  ✓ chyi-cfg-agent installed"
echo "  → pair at $CFG_SCHEME://$CFG_HOST/live with $CODE"
echo
`;

/** Detect the scheme this request was served over.
 *
 * Behind a reverse proxy (Deno Deploy, nginx, Cloudflare, ...), the inner
 * request is plain HTTP but `x-forwarded-proto: https` reveals the public
 * scheme. Direct connections (local dev) report their actual URL scheme.
 */
function detectScheme(req: Request): "http" | "https" {
  const xfp = req.headers.get("x-forwarded-proto");
  if (xfp) {
    const first = xfp.split(",")[0].trim().toLowerCase();
    if (first === "https") return "https";
    if (first === "http") return "http";
  }
  try {
    const u = new URL(req.url);
    if (u.protocol === "https:") return "https";
    if (u.protocol === "http:") return "http";
  } catch {
    // fall through
  }
  return "https";
}

/** Some dev workflows serve install.sh from Vite (default port 5173) which
 *  can't carry WebSocket upgrades — we rewrite to the cloud port (8001 by
 *  default) so the installed agent connects to a port that actually works. */
function rewriteDevHost(host: string): string {
  const cloudPort = Deno.env.get("CFG_DEV_PORT") ?? "8001";
  const vitePort = Deno.env.get("CFG_DEV_VITE_PORT") ?? "5173";
  if (host.endsWith(":" + vitePort)) {
    return host.replace(":" + vitePort, ":" + cloudPort);
  }
  return host;
}

/** Placeholder SHA is recognized by install.sh's `verify_sha`, which skips
 *  verification with a "development build" warning. We fall back to this only
 *  if the release pipeline hasn't published yet (or KV is briefly unavailable). */
const SHA_PLACEHOLDER = "SHA256_PLACEHOLDER_RELEASE_PIPELINE_FILLS_THIS";

export const handler = define.handlers({
  async GET(ctx) {
    const rawHost = ctx.req.headers.get("host") ?? "cfg.chyi.io";
    const host = rewriteDevHost(rawHost);
    const scheme = detectScheme(ctx.req);
    const wsScheme = scheme === "https" ? "wss" : "ws";
    const v = version();
    const assetName = `chyi-cfg-agent-${v}-x86_64-linux`;

    // Fetch the SHA256 that the release workflow published alongside the
    // binary. KV-cached (24h on success, 5min on miss). If the release doesn't
    // exist yet — e.g. during the minutes between a tag push and the workflow
    // finishing — we fall through to the placeholder, which install.sh skips
    // with a warning. Dev installs from localhost also hit the placeholder path
    // since there's no GitHub release for a dev-only binary.
    const binSha = host.includes("localhost") || host.includes("127.0.0.1")
      ? null
      : await getBinSha256(v, assetName);

    const body = TEMPLATE
      .replaceAll("__CFG_VERSION__", v)
      .replaceAll("__CFG_SCHEME__", scheme)
      .replaceAll("__CFG_WS_SCHEME__", wsScheme)
      .replaceAll("__CFG_HOST__", host)
      .replaceAll("__AGENT_VERSION__", v)
      .replaceAll("__BIN_URL__", `${scheme}://${host}/dist/${assetName}`)
      .replaceAll("__BIN_SHA256__", binSha ?? SHA_PLACEHOLDER);

    return new Response(body, {
      headers: {
        "Content-Type": "text/x-shellscript; charset=utf-8",
        "Content-Disposition": 'inline; filename="install.sh"',
        // Cache for 5 minutes so the SHA propagates within a release cycle
        // but we don't hammer GitHub on every refresh.
        "Cache-Control": "public, max-age=300",
      },
    });
  },
});
