// Loads libCFApi.so via Deno.dlopen and exposes the SDK symbols we need.
// ABI notes:
//   1. `long timeoutMs` in OpenNetConnection is 8 bytes on Linux LP64 (i64).
//   2. SetRemoteNetInfo takes RemoteNetInfo BY VALUE — declared as struct.
//   3. SetDevicePara_J is used (25 individual u8 args) to dodge struct-by-value.

import { ensureDriverNatives } from "../../embedded_libs.ts";

const DRIVER_ID = "chafon-m200";
const NATIVE_FILES = ["libCFApi.so", "libhid.so"];

export function libDir(libPath: string): string {
  const lastSlash = libPath.lastIndexOf("/");
  return lastSlash >= 0 ? libPath.substring(0, lastSlash) : ".";
}

/**
 * Resolve `libCFApi.so` in this order:
 *   1. CHYI_CFG_AGENT_LIB_PATH env var (highest priority — for ops overrides).
 *   2. Files extracted from the compiled binary's embedded `--include native/`.
 *      For `deno compile` builds this is the default path; the .so files are
 *      shipped INSIDE the binary and extracted to the cache dir on first run.
 *   3. <binary dir>/native/libCFApi.so — for the install.sh layout where the
 *      binary lives in `~/.local/share/chyi-cfg-agent/` and a sibling
 *      `native/` holds the libs (also covers manual installs).
 *   4. Source-layout fallback `<source>/agent/native/libCFApi.so` — for
 *      `deno run` directly from the repo without a compiled binary.
 *
 * Returns the FIRST candidate that exists on disk, or the most likely one for
 * the diagnostic message if none exist yet.
 */
export function resolveLibPath(): string {
  const envPath = Deno.env.get("CHYI_CFG_AGENT_LIB_PATH");
  if (envPath && envPath.length > 0) return envPath;

  const candidates: string[] = [];

  // 2. Extract this driver's embedded libs (no-op if already extracted).
  try {
    const extracted = ensureDriverNatives(DRIVER_ID, NATIVE_FILES);
    if (extracted) candidates.push(`${extracted}/libCFApi.so`);
  } catch {
    // ignore — fall through to other candidates
  }

  // 3. Sibling of binary (covers manual installs).
  try {
    const exeDir = libDir(Deno.execPath());
    candidates.push(`${exeDir}/native/libCFApi.so`);
    candidates.push(`${exeDir}/../share/chyi-cfg-agent/native/libCFApi.so`);
  } catch {
    // ignore
  }

  // 4. Source layout (running `deno run` from the repo).
  try {
    candidates.push(new URL("./native/libCFApi.so", import.meta.url).pathname);
  } catch {
    // ignore
  }

  for (const p of candidates) {
    try {
      if (Deno.statSync(p).isFile) return p;
    } catch {
      // not present; try next
    }
  }
  return candidates[0] ?? "/usr/lib/libCFApi.so";
}

const SET_DEVICE_PARA_J_PARAMS = [
  "i64",
  ...Array.from({ length: 25 }, () => "u8" as const),
] as const;

let _lib: Deno.DynamicLibrary<Record<string, Deno.ForeignFunction>> | null =
  null;

function open() {
  if (_lib) return _lib;
  const path = resolveLibPath();
  try {
    _lib = Deno.dlopen(path, {
      OpenNetConnection: {
        parameters: ["buffer", "buffer", "u16", "i64"],
        result: "i32",
      },
      CloseDevice: { parameters: ["i64"], result: "i32" },
      GetDeviceInfo: { parameters: ["i64", "buffer"], result: "i32" },
      GetDevicePara: { parameters: ["i64", "buffer"], result: "i32" },
      SetDevicePara_J: { parameters: SET_DEVICE_PARA_J_PARAMS, result: "i32" },
      GetRemoteNetInfo: { parameters: ["i64", "buffer"], result: "i32" },
      SetRemoteNetInfo: {
        parameters: ["i64", {
          struct: ["u8", "u8", "u8", "u8", "u8", "u8", "u8", "u8"],
        }],
        result: "i32",
      },
      BeginWhiteList: { parameters: ["i64", "u8", "u16"], result: "i32" },
      SetWhiteList: { parameters: ["i64", "u16", "buffer"], result: "i32" },
      EndWhiteList: { parameters: ["i64", "buffer"], result: "i32" },
      GetWhiteList: { parameters: ["i64", "buffer", "u16"], result: "i32" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Failed to load libCFApi.so from '${path}': ${msg}\n` +
        "If running a compiled binary, the libs should auto-extract; check\n" +
        "  CHYI_CFG_AGENT_HOME (or XDG_CACHE_HOME) is writable.\n" +
        "Otherwise set CHYI_CFG_AGENT_LIB_PATH explicitly.",
    );
  }
  return _lib;
}

export function cfapi(): ReturnType<typeof open>["symbols"] {
  return open().symbols;
}

export function closeLib(): void {
  _lib?.close();
  _lib = null;
}

export function cstr(s: string): Uint8Array<ArrayBuffer> {
  const encoded = new TextEncoder().encode(s);
  const buf = new Uint8Array(new ArrayBuffer(encoded.length + 1));
  buf.set(encoded);
  return buf;
}
