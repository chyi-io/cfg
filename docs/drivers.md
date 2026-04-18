# Adding a Device Driver

The agent supports multiple device families through a small `Driver` interface. Each driver:

- Knows how to **open** a connection to its kind of device (TCP/IP, FFI, serial, ...).
- Declares its **capabilities** — the feature tabs the cloud UI will render.
- Provides **typed handlers** for each command its capabilities advertise.

The dispatcher routes per-driver: if a command isn't in a driver's `handlers`, the cloud surfaces a clear "not supported by this device" error (HTTP 501).

## File layout

```
agent/drivers/
  types.ts             ← Driver, Device, OpenParams, DriverHandlers (don't edit)
  registry.ts          ← register / get / list (don't edit)
  index.ts             ← register your driver here
  chafon-m200/         ← reference driver (folder name = Driver.id, with hyphens)
    index.ts           ← exports the Driver object
    reader.ts          ← talks to the actual device
    mock_reader.ts     ← in-memory fake for CHYI_CFG_FFI=mock
    structs.ts         ← binary protocol / struct codecs
    lib.ts             ← FFI symbol declarations + resolveLibPath()
    native/            ← .so files bundled into the binary
      libCFApi.so
      libhid.so
      SHA256SUMS
      README.md        ← provenance notes
```

**Folder name MUST match `Driver.id`** (e.g. id `acme-scale-x1` → folder `acme-scale-x1`). The embedded-libs extractor derives the filesystem path from the driver id, so a mismatch means your native libs can't be found at runtime.

To add a driver, create `agent/drivers/<your-driver-id>/` and `register()` it from `agent/drivers/index.ts`.

## Step 1 — declare a Capability (only if it's new)

If your device exposes a feature that no current driver supports, add it to `shared/capabilities.ts`:

```ts
export type Capability =
  | "device_info"
  | "work_mode"
  | "remote_server"
  | "whitelist"
  | "scale_calibration"; // ← new
```

Then add a label to `CAPABILITY_LABELS` and decide which `CommandName`s it implies.

## Step 2 — declare commands (only if new)

Capabilities are realized as commands in `shared/protocol.ts`:

```ts
export type CommandName =
  | ...existing
  | "scale.tare"
  | "scale.calibrate";

export interface CommandPayloads {
  ...existing;
  "scale.tare": Record<string, never>;
  "scale.calibrate": { knownWeightG: number };
}

export interface CommandResponses {
  ...existing;
  "scale.tare": Record<string, never>;
  "scale.calibrate": { offset: number };
}
```

Both ends type-check against this single source of truth.

## Step 3 — write the driver

```ts
// agent/drivers/my_scale/index.ts
import type { Device, Driver, DriverHandlers, OpenParams } from "../types.ts";

class ScaleDevice implements Device {
  readonly id = crypto.randomUUID();
  private closed = false;
  // ... your transport state (TCP socket, FFI handle, serial port, ...)

  isClosed(): boolean { return this.closed; }
  close(): Promise<void> { this.closed = true; return Promise.resolve(); }

  async tare(): Promise<void> { /* ... */ }
  async calibrate(knownG: number): Promise<{ offset: number }> { /* ... */ }
  async info(): Promise<{ model: string; serial: string }> { /* ... */ }
}

const handlers: DriverHandlers = {
  async "connection.info"(d) {
    return await (d as ScaleDevice).info();
  },
  async "scale.tare"(d) {
    await (d as ScaleDevice).tare();
    return {};
  },
  async "scale.calibrate"(d, p) {
    return await (d as ScaleDevice).calibrate(p.knownWeightG);
  },
};

export const myScaleDriver: Driver = {
  id: "acme-scale-x1",                // MUST match the folder name
  name: "Acme Scale X1",
  description: "Industrial weighing scale (TCP, port 5000)",
  capabilities: ["device_info", "scale_calibration"],
  nativeLibs: ["libScale.so"],        // optional — listed from drivers/<id>/native/
  async open(params: OpenParams): Promise<Device> {
    // ... open TCP / FFI / serial here, return your ScaleDevice
    throw new Error("not implemented");
  },
  handlers,
};
```

## Step 4 — register

```ts
// agent/drivers/index.ts
import { register } from "./registry.ts";
import { chafonM200Driver } from "./chafon_m200/index.ts";
import { myScaleDriver } from "./my_scale/index.ts";

export function initBuiltinDrivers(): void {
  if (initialized) return;
  initialized = true;
  register(chafonM200Driver);
  register(myScaleDriver); // ← add this line
}
```

## Step 5 — UI (optional)

For a minimal driver, the existing UI is enough: the **Connect** form discovers your driver via `drivers.list`, the **Device info** card auto-renders whatever fields your `connection.info` returns (any object with string keys).

For a feature page (e.g. tare button for a scale), add:
- A new island under `islands/live/ScaleEditor.tsx` (use `useAgentSocket`, call `socket.request("scale.tare", {})`).
- A new route under `routes/live/[agent]/scale.tsx` rendering it.
- A new entry in `components/live/FeatureNav.tsx`'s `ITEMS` array, gated by your capability.

The nav already filters tabs by `capabilities`, so users only see tabs their device supports.

## Native libraries

If your driver uses FFI (`Deno.dlopen`):

1. Drop the `.so` file(s) into `agent/drivers/<your-driver-id>/native/`.
2. List the file names (not paths) in `Driver.nativeLibs`:
   ```ts
   nativeLibs: ["libScale.so", "libUsbHelper.so"],
   ```
3. Resolve the runtime path with the shared helper:
   ```ts
   import { ensureDriverNatives } from "../../embedded_libs.ts";
   const dir = ensureDriverNatives("acme-scale-x1", ["libScale.so", "libUsbHelper.so"]);
   const libPath = `${dir}/libScale.so`;
   Deno.dlopen(libPath, { … });
   ```
4. Drop a `README.md` in `native/` with provenance (vendor SDK name, version, upstream URL) and a `SHA256SUMS` for auditability.

At runtime `agent/bootstrap.ts` calls `ensureAllDriverNatives()` to extract every registered driver's libs to `<cache>/<driver-id>/`, then re-execs the agent with `LD_LIBRARY_PATH` prepended with each cache dir. Dependent `.so` files (like `libhid.so` for the Chafon driver) are resolved automatically — no `LD_LIBRARY_PATH` entries to manage by hand.

At build time `deno compile --include drivers` bundles the whole `drivers/` tree (including every `native/` subdir) into the single binary. Nothing ships or downloads separately.

## Mock support

For dev without hardware, your driver should honor `CHYI_CFG_FFI=mock`:

```ts
async open(params: OpenParams): Promise<Device> {
  if (Deno.env.get("CHYI_CFG_FFI") === "mock") {
    return new MockScaleDevice();
  }
  return new ScaleDevice(params);
}
```

This makes `deno task dev:mock` work for everyone, and lets `scripts/smoke_e2e.ts` exercise your driver in CI without a real scale on the desk.

## Testing

- **Unit tests** for any binary protocol packing/unpacking go under `agent/tests/` — pure byte-array tests, no FFI.
- **Dispatcher integration** is automatic — `agent/tests/dispatcher_test.ts` already validates round-trip through the dispatcher; add a few cases for your driver's commands.
- **Hardware smoke** lives in `agent/tests/hw_smoke_test.ts`, gated by `CFG_HW=1`.

### Dev loop

```sh
# From cfg/ root — starts cloud (8001) + vite (5173) + agent with mock FFI:
deno task dev

# From cfg/agent/ — run the agent standalone against any cloud URL:
CHYI_CFG_URL=ws://localhost:8001/api/agent/ws CHYI_CFG_FFI=mock deno task dev

# Same, with --watch (restarts on file change — useful for driver-code iteration):
CHYI_CFG_URL=ws://localhost:8001/api/agent/ws CHYI_CFG_FFI=mock deno task dev:mock:watch

# Ship a new release — bump the version and rebuild:
# 1. edit agent/deno.json → "version": "0.x.y"
# 2. deno task agent:compile
# 3. tag + push → release.yml builds, signs, uploads, deploys
```

## Tips

- Keep all transport / parsing code inside `drivers/<your_driver>/`. The shared layer (cloud, dispatcher) should never need to import driver-specific types.
- Treat the `Device` returned by `open()` as opaque from the dispatcher's perspective — it's only handed back to your handlers.
- If multiple capabilities share underlying state (e.g. a mutex), put them in your `Device` class. The dispatcher already serializes commands via its `BUSY` queue, but per-device thread safety is the driver's responsibility.
