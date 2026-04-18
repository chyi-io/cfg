// ANSI color helpers. No deps. Auto-disable when stdout isn't a TTY (so
// piped output and systemd journal stay readable).

const isTTY = (() => {
  try {
    return Deno.stdout.isTerminal();
  } catch {
    return false;
  }
})();

const noColor = Deno.env.get("NO_COLOR") !== undefined ||
  Deno.env.get("CFG_NO_COLOR") !== undefined ||
  !isTTY;

function wrap(start: string, s: string): string {
  return noColor ? s : `\x1b[${start}m${s}\x1b[0m`;
}

export const term = {
  bold: (s: string) => wrap("1", s),
  dim: (s: string) => wrap("2", s),
  red: (s: string) => wrap("31", s),
  green: (s: string) => wrap("32", s),
  yellow: (s: string) => wrap("33", s),
  blue: (s: string) => wrap("34", s),
  cyan: (s: string) => wrap("36", s),
  gray: (s: string) => wrap("90", s),
  ok: (s: string) => wrap("32", `✓ ${s}`),
  fail: (s: string) => wrap("31", `✗ ${s}`),
  warn: (s: string) => wrap("33", `! ${s}`),
  step: (s: string) => wrap("36", `→ ${s}`),
};

export function header(title: string): void {
  console.log("");
  console.log(term.bold(title));
  console.log(term.dim("─".repeat(Math.max(20, title.length))));
}
