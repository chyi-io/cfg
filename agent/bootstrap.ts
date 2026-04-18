// Ensures every driver's `.so` files (and their dependents) are resolvable by
// the dynamic loader before any FFI call. Deno.dlopen can't preload deps with
// RTLD_GLOBAL semantics, and Linux's loader needs LD_LIBRARY_PATH (or DT_RPATH
// in the .so itself, which most vendors don't set) to find sibling libs.
//
// Order of operations:
//   1. Initialise the driver registry so we know which drivers ship libs.
//   2. Extract each driver's bundled libs to a stable cache dir (idempotent).
//   3. If the resulting LD_LIBRARY_PATH would change, re-exec ourselves with
//      it set. This is invisible to the user; keeps systemd unit and shell
//      invocations free of LD_LIBRARY_PATH boilerplate.

import { initBuiltinDrivers } from "./drivers/index.ts";
import { ensureAllDriverNatives } from "./embedded_libs.ts";

export async function maybeReexec(): Promise<void> {
  if (Deno.env.get("CHYI_CFG_AGENT_BOOTSTRAPPED") === "1") return;
  if (Deno.env.get("CHYI_CFG_FFI") === "mock") return;

  // Drivers must be registered so we know which native libs to extract.
  initBuiltinDrivers();
  const dirs = ensureAllDriverNatives();
  if (dirs.size === 0) return; // no drivers ship libs (e.g. all-mock build)

  const existing = Deno.env.get("LD_LIBRARY_PATH") ?? "";
  const parts = existing.split(":").filter(Boolean);
  const newDirs = [...dirs.values()].filter((d) => !parts.includes(d));
  if (newDirs.length === 0) {
    Deno.env.set("CHYI_CFG_AGENT_BOOTSTRAPPED", "1");
    return;
  }
  const nextPath = [...newDirs, ...parts].join(":");

  const env = { LD_LIBRARY_PATH: nextPath, CHYI_CFG_AGENT_BOOTSTRAPPED: "1" };

  // Detect compiled-binary vs `deno run` mode by inspecting the executable.
  // `deno compile` output is named after the binary (e.g. chyi-cfg-agent),
  // not "deno"; `deno run` is the deno executable itself.
  const exe = Deno.execPath();
  const exeBase = exe.substring(exe.lastIndexOf("/") + 1).toLowerCase();
  const isCompiledBinary = exeBase !== "deno" && exeBase !== "deno.exe";

  const args = isCompiledBinary
    ? Deno.args
    : [
      "run",
      "--allow-net",
      "--allow-env",
      "--allow-read",
      "--allow-write",
      "--allow-ffi",
      "--allow-run",
      "--unstable-ffi",
      Deno.mainModule,
      ...Deno.args,
    ];

  const child = new Deno.Command(exe, {
    args,
    env,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  }).spawn();

  const status = await child.status;
  Deno.exit(status.code);
}
