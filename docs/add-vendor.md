# Adding a New Vendor

This guide walks through adding a completely new vendor (e.g. "Queclink") to the
configurator.

## Directory Structure

Create the following files:

```
vendors/queclink/
├── mod.ts           # Plugin entry point
├── parser.ts        # File parse & generate
├── detect.ts        # Device detection logic
├── categories.ts    # Category definitions
├── schemas.ts       # Parameter schemas
└── devices/
    └── gl300.ts     # Device definition
```

## Step 1: Implement `parser.ts`

Export two functions: `parse` (file buffer → flat config) and `generate` (flat
config → file buffer).

```ts
import type { ParseResult } from "../../lib/types.ts";

export const parseQueclinkConfig = async (
  buffer: Uint8Array,
): Promise<ParseResult> => {
  try {
    const content = new TextDecoder().decode(buffer);
    const config: Record<string, string> = {};

    // ... your parse logic here ...
    // Split lines, extract key=value pairs, etc.

    if (Object.keys(config).length === 0) {
      return { success: false, error: "No parameters found" };
    }
    return { success: true, config };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Parse error",
    };
  }
};

export const generateQueclinkConfig = async (
  config: Record<string, string>,
): Promise<Uint8Array> => {
  // Reconstruct the file format from the flat config map
  const lines = Object.entries(config).map(([k, v]) => `${k}=${v}`);
  return new TextEncoder().encode(lines.join("\n") + "\n");
};
```

### Parser Requirements

- `parse()` receives raw `Uint8Array` bytes (may need decompression)
- Must return `{ success: true, config }` or `{ success: false, error }`
- Config is always a flat `Record<string, string>` — even numeric values are
  stored as strings
- `generate()` must produce the exact file format the device expects
- Both functions are `async` to support streaming decompression

## Step 2: Implement `detect.ts`

Determine which device variant a parsed config belongs to. This is called after
a successful parse.

```ts
export const detectQueclinkDevice = (
  config: Record<string, string>,
): string => {
  // Inspect config keys or values to determine the device variant
  if (config["ModelType"]?.includes("GL300")) return "gl300";
  return "gl300"; // default fallback
};
```

### Detection Tips

- Check for parameter keys unique to a device variant
- Check parameter value ranges or patterns
- Always provide a sensible default fallback
- The returned string must match a `DeviceDefinition.id`

## Step 3: Implement `categories.ts`

Define parameter categories for the sidebar navigation and a `categorizeParam`
function.

```ts
import type { CategoryDef } from "../../lib/types.ts";

export const queclinkCategories: readonly CategoryDef[] = [
  {
    id: "general",
    label: "General",
    icon: "⚙️",
    color: "bg-blue-100 text-blue-700",
    order: 0,
  },
  {
    id: "network",
    label: "Network",
    icon: "🌐",
    color: "bg-green-100 text-green-700",
    order: 1,
  },
  {
    id: "tracking",
    label: "Tracking",
    icon: "📍",
    color: "bg-red-100 text-red-700",
    order: 2,
  },
  {
    id: "other",
    label: "Other",
    icon: "📁",
    color: "bg-stone-100 text-stone-700",
    order: 99,
  },
];

export const categorizeParam = (paramId: number): string => {
  if (paramId < 100) return "general";
  if (paramId < 200) return "network";
  if (paramId < 300) return "tracking";
  return "other";
};
```

### Category Fields

| Field        | Type      | Description                                         |
| ------------ | --------- | --------------------------------------------------- |
| `id`         | `string`  | Unique key, used in `categorizeParam` return values |
| `label`      | `string`  | Display name in the sidebar                         |
| `icon`       | `string`  | Emoji or icon string                                |
| `color`      | `string`  | Tailwind CSS classes for badge styling              |
| `order`      | `number`  | Sort order (lower = first)                          |
| `deviceOnly` | `string?` | If set, only shown for this specific device         |

### Notes on `categorizeParam`

- For **numeric-key** formats (like Teltonika), categorize by numeric range
- For **string-key** formats (like Chafon INI), the category is looked up from
  `paramSchemas` instead, so `categorizeParam` can return `"other"` as a
  fallback

## Step 4: Implement `schemas.ts`

Define parameter schemas with Zod validation, dropdown options, and numeric
ranges.

```ts
import { z } from "zod";
import type { ParamOption, ParamSchema } from "../../lib/types.ts";

interface RawDef {
  name: string;
  type: "number" | "string";
  description: string;
  category: string;
  options?: ParamOption[];
  hint?: string;
  min?: number;
  max?: number;
}

const toParamSchema = (id: string, d: RawDef): ParamSchema => {
  let zodSchema;
  if (d.options?.length) {
    zodSchema = z.enum(
      d.options.map((o) => o.value) as [string, ...string[]],
    );
  } else if (d.type === "number") {
    let s = z.coerce.number();
    if (d.min !== undefined) s = s.min(d.min);
    if (d.max !== undefined) s = s.max(d.max);
    zodSchema = s;
  } else {
    zodSchema = z.string();
  }
  return { id, ...d, zodSchema };
};

const _rawDefs: Record<string, RawDef> = {
  "ServerIP": {
    name: "Server IP",
    type: "string",
    description: "Primary server address",
    category: "network",
    hint: "e.g. 192.168.1.1",
  },
  "ServerPort": {
    name: "Server Port",
    type: "number",
    description: "Server TCP port",
    category: "network",
    hint: "1-65535",
    min: 1,
    max: 65535,
  },
  "ReportInterval": {
    name: "Report Interval",
    type: "number",
    description: "Data reporting interval in seconds",
    category: "tracking",
    hint: "Seconds",
    min: 1,
    max: 86400,
  },
};

export const gl300ParamSchemas = Object.fromEntries(
  Object.entries(_rawDefs).map(([id, d]) => [id, toParamSchema(id, d)]),
);

export const buildFallbackSchema = (paramId: string): ParamSchema =>
  toParamSchema(paramId, {
    name: paramId,
    type: "string",
    description: `Parameter: ${paramId}`,
    category: "other",
  });
```

### Schema Fields

| Field         | Type                     | UI Effect                                  |
| ------------- | ------------------------ | ------------------------------------------ |
| `options`     | `ParamOption[]`          | Renders a `<select>` dropdown              |
| `hint`        | `string`                 | Input placeholder text                     |
| `min` / `max` | `number`                 | Shown as validation range, enforced by Zod |
| `type`        | `"string"` or `"number"` | Determines input type and Zod schema       |

### Enum Options

```ts
const OPT_PROTOCOL: ParamOption[] = [
  { value: "0", label: "TCP" },
  { value: "1", label: "UDP" },
];
```

When `options` is present, the UI renders a dropdown. The `value` is what gets
stored in the config; the `label` is what the user sees.

## Step 5: Create device definition

In `devices/gl300.ts`:

```ts
import type { DeviceDefinition } from "../../../lib/types.ts";
import { queclinkCategories } from "../categories.ts";
import { gl300ParamSchemas } from "../schemas.ts";

// Start with empty strings for all params
const defaults: Record<string, string> = Object.fromEntries(
  Object.keys(gl300ParamSchemas).map((id) => [id, ""]),
);

// Override with factory defaults
Object.assign(defaults, {
  ServerIP: "0.0.0.0",
  ServerPort: "5000",
  ReportInterval: "60",
});

export const gl300Device: DeviceDefinition = {
  id: "gl300",
  name: "Queclink GL300",
  vendorId: "queclink",
  categories: queclinkCategories,
  paramSchemas: gl300ParamSchemas,
  defaults,
};
```

## Step 6: Create `mod.ts`

Wire everything together into a `VendorPlugin`:

```ts
import type { ParamSchema, VendorPlugin } from "../../lib/types.ts";
import { generateQueclinkConfig, parseQueclinkConfig } from "./parser.ts";
import { detectQueclinkDevice } from "./detect.ts";
import { categorizeParam } from "./categories.ts";
import { buildFallbackSchema } from "./schemas.ts";
import { gl300Device } from "./devices/gl300.ts";

export const queclinkPlugin: VendorPlugin = {
  id: "queclink",
  name: "Queclink",
  fileExtensions: [".cfg"],
  devices: [gl300Device],
  parse: parseQueclinkConfig,
  generate: generateQueclinkConfig,
  detectDevice: detectQueclinkDevice,
  categorizeParam,
  getParamSchema: (_deviceId: string, paramId: string): ParamSchema =>
    gl300Device.paramSchemas[paramId] ?? buildFallbackSchema(paramId),
};
```

## Step 7: Register in `main.ts`

```ts
import { queclinkPlugin } from "./vendors/queclink/mod.ts";
registerVendor(queclinkPlugin);
```

That's it! The landing page, API routes, and config editor will automatically
pick up the new vendor.

## Step 8: Add tests

Create `tests/queclink/` with:

- **Parser tests** — round-trip parse + generate
- **Schema tests** — validate known params, test fallback
- **Detection tests** — correct device ID from sample configs
- **Fixture files** — sample configs in `tests/fixtures/`

## Step 9: Update `deno.json`

Add `vendors/queclink/mod.ts` to the `docs` task so JSDoc is generated:

```json
"docs": "deno doc --html --output=static/docs/api/ ... vendors/queclink/mod.ts"
```

## Checklist

- [ ] `vendors/queclink/parser.ts` — parse + generate
- [ ] `vendors/queclink/detect.ts` — device detection
- [ ] `vendors/queclink/categories.ts` — categories + categorizeParam
- [ ] `vendors/queclink/schemas.ts` — param schemas + fallback
- [ ] `vendors/queclink/devices/gl300.ts` — device definition
- [ ] `vendors/queclink/mod.ts` — plugin entry
- [ ] `main.ts` — registerVendor call
- [ ] `tests/queclink/` — test suite
- [ ] `deno.json` — docs task updated
