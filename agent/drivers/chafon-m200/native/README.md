# Native Libraries — Chafon M200 driver

Vendor `.so` files needed by the Chafon M200 driver. They are bundled into the
compiled `chyi-cfg-agent` binary via `deno compile --include drivers` and
extracted to a per-driver cache dir on first run.

## Files

- `libCFApi.so` — Chafon M200 SDK, C ABI. Provides the 11 symbols the agent
  uses (see `agent/drivers/chafon-m200/lib.ts`). x86_64-linux-gnu only.
- `libhid.so` — HID dependency that `libCFApi.so` dynamically links against.
  Required for `dlopen` to resolve symbols at load time.

## Provenance

Source: vendor SDK (Chafon M200), `Library/Linux/` directory. Drop the `.so`
files from the SDK into this folder; the next agent build (`deno task
agent:compile`) bundles them into the binary. Record SHA256 + SDK version in
`SHA256SUMS` when updating.

## Resolution order at runtime

1. `CHYI_CFG_AGENT_LIB_PATH` env var — **override only**, used when ops needs
   to point at a custom build of `libCFApi.so`. Not normally set.
2. **Embedded extraction** (default for compiled binaries): `agent/bootstrap.ts`
   runs `embedded_libs.ensureAllDriverNatives()` before any FFI call, which
   extracts each driver's bundled `.so` files to `<cache>/<driver-id>/` and
   prepends those dirs to `LD_LIBRARY_PATH` for the dynamic loader.
3. **Sibling of the binary** (manual installs): `<binary-dir>/native/`.
4. **Source layout** (`deno run` from the repo): this directory directly.

The bootstrap re-exec sets `LD_LIBRARY_PATH` automatically — no per-host setup,
no systemd Environment line needed for the lib path.

## Adding new files

To add another `.so` for this driver, drop it here and add it to the
`nativeLibs` array on `chafonM200Driver` in `agent/drivers/chafon-m200/index.ts`.
