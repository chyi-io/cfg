// Per-driver native lib bundling.
//
// Each driver lists its `.so` files in its Driver.nativeLibs property. The
// files live under `agent/drivers/<id>/native/<file>` in the source tree and
// are bundled into the compiled binary via `deno compile --include drivers`.
//
// At first startup the agent extracts all known driver libs into a stable
// cache directory:
//
//   <cache>/chyi-cfg-agent/native/<driver-id>/<file>
//
// `bootstrap.ts` adds each driver's extracted dir to LD_LIBRARY_PATH, so the
// dynamic loader can resolve dependent libraries (e.g. libhid.so for the
// Chafon driver) without any per-host setup.

import { join } from "jsr:@std/path@^1";
import { ensureDirSync } from "jsr:@std/fs@^1";

export function nativeCacheRoot(): string {
  const home = Deno.env.get("CHYI_CFG_AGENT_HOME");
  if (home) return join(home, "native");
  const xdg = Deno.env.get("XDG_CACHE_HOME");
  if (xdg) return join(xdg, "chyi-cfg-agent", "native");
  const homeDir = Deno.env.get("HOME") ?? ".";
  return join(homeDir, ".cache", "chyi-cfg-agent", "native");
}

export function driverNativeDir(driverId: string): string {
  return join(nativeCacheRoot(), driverId);
}

const MAIN_URL: string = (() => {
  // Resolve agent/main.ts URL once. Used as the base for all driver native
  // file URL resolution. In compile mode this resolves into the embedded VFS;
  // in source mode it points at the on-disk source.
  // Walk up from this module: <agent>/embedded_libs.ts → <agent>/main.ts.
  return new URL("./main.ts", import.meta.url).href;
})();

function readEmbedded(driverId: string, file: string): Uint8Array | null {
  try {
    const url = new URL(`./drivers/${driverId}/native/${file}`, MAIN_URL);
    return Deno.readFileSync(url);
  } catch {
    return null;
  }
}

function sizeMatches(path: string, expected: number): boolean {
  try {
    const stat = Deno.statSync(path);
    return stat.isFile && stat.size === expected;
  } catch {
    return false;
  }
}

/**
 * Extract one driver's native libs to `<cache>/<driverId>/`. Returns the
 * directory path, or `null` if the driver declared libs but none are present
 * (a build packaging mistake we report loudly).
 *
 * Idempotent: skips writing files that already exist with the right size.
 */
export function ensureDriverNatives(
  driverId: string,
  files: string[],
): string | null {
  if (files.length === 0) return null;
  const dir = driverNativeDir(driverId);

  const blobs = files.map((f) => ({
    name: f,
    bytes: readEmbedded(driverId, f),
  }));
  if (blobs.every((b) => b.bytes === null)) {
    // Driver expected libs but the build didn't bundle them.
    console.warn(
      `[embedded_libs] driver "${driverId}" declared nativeLibs but none ` +
        `were found in the bundle. Was the agent compiled with ` +
        `\`--include drivers\`? Place the .so files at ` +
        `agent/drivers/${driverId}/native/ and recompile.`,
    );
    return null;
  }

  let allOk = true;
  for (const b of blobs) {
    if (!b.bytes) continue;
    if (!sizeMatches(join(dir, b.name), b.bytes.byteLength)) {
      allOk = false;
      break;
    }
  }
  if (allOk) return dir;

  ensureDirSync(dir);
  for (const b of blobs) {
    if (!b.bytes) continue;
    Deno.writeFileSync(join(dir, b.name), b.bytes, { mode: 0o644 });
  }
  return dir;
}

/**
 * Extract native libs for ALL registered drivers. Returns the map of
 * `driverId → extracted directory`. Driver registry must be initialised
 * before calling.
 */
export function ensureAllDriverNatives(): Map<string, string> {
  // Late import to avoid pulling the registry into bootstrap before it's
  // initialised in the regular flow.
  const out = new Map<string, string>();
  for (const driver of getRegisteredDrivers()) {
    if (!driver.nativeLibs || driver.nativeLibs.length === 0) continue;
    const dir = ensureDriverNatives(driver.id, driver.nativeLibs);
    if (dir) out.set(driver.id, dir);
  }
  return out;
}

// Lazy import via dynamic helper (keeps this module independent of registry
// load order).
import { list as listDrivers } from "./drivers/registry.ts";
function getRegisteredDrivers() {
  return listDrivers();
}
