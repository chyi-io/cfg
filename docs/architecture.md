# Architecture Guide

## Overview

The Chyi Hardware Configurator is a multi-vendor IoT configuration editor built on **Deno Fresh 2.x** with a plugin-based architecture. Each vendor is a self-contained module that registers itself with a central registry.

## Core Concepts

### Vendor Plugin System

Every vendor implements the `VendorPlugin` interface (`lib/types.ts`):

```
VendorPlugin
├── id, name, fileExtensions
├── devices: DeviceDefinition[]
├── parse(buffer) → ParseResult
├── generate(config) → Uint8Array
├── detectDevice(config) → string
├── categorizeParam(id) → string
└── getParamSchema(deviceId, paramId) → ParamSchema
```

Plugins are registered at startup in `main.ts` via `registerVendor()`.

### Device Definitions

Each device has:
- **paramSchemas** — `Record<string, ParamSchema>` defining all known parameters
- **categories** — Ordered list of `CategoryDef` for sidebar grouping
- **defaults** — Default config values for "Create New" flow

### Parameter Schemas

`ParamSchema` includes:
- `type`: `"string"` | `"number"`
- `options`: Enum values (rendered as `<select>`)
- `min` / `max`: Numeric range constraints
- `hint`: Placeholder text for inputs
- `category`: Maps to a `CategoryDef.id`

Zod schemas are generated dynamically from `ParamSchema` in `lib/validation.ts`.

### Registry (`lib/registry.ts`)

- `registerVendor(plugin)` — Adds vendor to global map
- `getVendor(id)` — Lookup by ID
- `listVendors()` — All registered vendors
- `detectVendorFromFile(buffer, filename)` — Tries each vendor's parser + detector
- `buildStructuredConfig(vendor, config)` — Groups flat config into `{ [category]: { [paramId]: value } }`
- `getAllVendorParamIds(vendor)` — Superset of param IDs across all devices

### Validation (`lib/validation.ts`)

- `validateParam(schema, value)` — Single param validation via Zod
- `validateConfig(vendor, device, config)` — Full config validation
- `buildFullVendorConfig(vendor, device, config)` — Merges all vendor params (incompatible ones get empty string)
- `serializeAllParamMetas(vendor, device, config)` — Produces `ParamMeta` objects for the client, with `compatible` flag

## Data Flow

### Upload Flow
```
User drops file → POST /api/upload
  → detectVendorFromFile() tries each vendor parser
  → buildFullVendorConfig() fills all vendor params
  → serializeAllParamMetas() marks compatibility
  → Response stored in sessionStorage
  → Redirect to /config/[vendor]/[device]
  → ConfigLoaderIsland reads sessionStorage, renders ConfigEditor
```

### Create New Flow
```
User clicks device card → GET /api/defaults?vendor=&device=
  → buildFullVendorConfig() with device defaults
  → sessionStorage + redirect to /config/[vendor]/[device]
```

### Download Flow
```
User clicks Download → POST /api/download
  → validateConfig() checks all params via Zod
  → vendor.generate(config) produces binary
  → Browser downloads file
```

## UI Architecture

```
ConfigEditor (island — state owner)
├── Sidebar (component — category nav + search)
├── CategoryPanel (component — param grid)
│   └── ParamField (component — single input)
├── MessageBanner (component — success/error)
└── BottomBar (component — status + download)
```

Shared types live in `components/types.ts`. The `ConfigEditor` island owns all state (config, validation errors, search, active category) and passes callbacks down.

## Adding a New Vendor

1. **Create directory**: `vendors/<name>/`
2. **Implement files**:
   - `parser.ts` — `parse(buffer)` and `generate(config)` functions
   - `detect.ts` — `detectDevice(config)` function
   - `categories.ts` — Category definitions and `categorizeParam()`
   - `schemas.ts` — Parameter schemas with `toParamSchema()` and `buildFallbackSchema()`
   - `devices/<device>.ts` — Device definition with paramSchemas and defaults
   - `mod.ts` — Export `VendorPlugin` object
3. **Register** in `main.ts`: `registerVendor(myPlugin)`
4. **Add tests** under `tests/<name>/`
5. **Update deno.json** `docs` task to include new `mod.ts`

## Testing

Tests use Deno's built-in test runner with `$std/assert`:

```bash
deno task test          # Run all tests
deno task test:watch    # Watch mode
```

Test organization:
- `tests/registry_test.ts` — Registry, detection, structured config
- `tests/validation_test.ts` — Zod validation, serialization
- `tests/teltonika/` — Teltonika-specific parser/category tests
- `tests/chafon/` — Chafon-specific parser/schema tests
- `tests/fixtures/` — Sanitized sample config files
