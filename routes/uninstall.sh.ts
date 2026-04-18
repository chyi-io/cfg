// Convenience wrapper around `chyi-cfg-agent uninstall`. Lets users do:
//   curl -fSL https://cfg.chyi.io/uninstall.sh | bash
// without having to remember the binary's location or subcommands.

import { define } from "../utils.ts";

const SCRIPT = `#!/usr/bin/env bash
# chyi-cfg-agent uninstaller
set -euo pipefail

BIN="\${CHYI_CFG_AGENT:-$(command -v chyi-cfg-agent || true)}"
if [[ -z "$BIN" ]]; then
  # Fall back to the canonical install location.
  if [[ -x "$HOME/.local/share/chyi-cfg-agent/chyi-cfg-agent" ]]; then
    BIN="$HOME/.local/share/chyi-cfg-agent/chyi-cfg-agent"
  else
    echo "chyi-cfg-agent binary not found. Nothing to uninstall." >&2
    exit 1
  fi
fi

echo "  → using $BIN"
# Pass --yes so the curl|bash flow doesn't get stuck on the [y/N] prompt.
# Run interactively (without piping into bash) and drop --yes if you want
# the safety prompt:  chyi-cfg-agent uninstall
exec "$BIN" uninstall --yes
`;

export const handler = define.handlers({
  GET() {
    return new Response(SCRIPT, {
      headers: {
        "Content-Type": "text/x-shellscript; charset=utf-8",
        "Content-Disposition": 'inline; filename="uninstall.sh"',
        "Cache-Control": "no-store",
      },
    });
  },
});
