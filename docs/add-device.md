# Adding a New Device

This guide shows how to add a new device variant to a vendor that already exists
(e.g. adding FMM to Teltonika).

## Overview

A **device** is a hardware variant within a vendor. For example, Teltonika has
FMB and FMC series. Each device can have its own set of supported parameters
while sharing the same parser, generator, and category definitions.

### Device vs Vendor

|                  | Vendor                           | Device                              |
| ---------------- | -------------------------------- | ----------------------------------- |
| Parser/Generator | Shared across devices            | Uses vendor's parser                |
| Categories       | Can be shared or device-specific | References vendor or own categories |
| Param Schemas    | —                                | Own set of supported parameters     |
| Defaults         | —                                | Own default values                  |
| Detection        | —                                | Identified by `detectDevice()`      |

## Step 1: Create the device definition file

Create `vendors/<vendor>/devices/<device_id>.ts`:

```ts
import type { DeviceDefinition } from "../../../lib/types.ts";
import { teltonikaCategories } from "../categories.ts";
import { teltonikaParamSchemas } from "../schemas.ts";

// Build param schemas — include or exclude as needed
const paramSchemas = {
  ...teltonikaParamSchemas,
  // Remove params not supported by this device:
  // delete paramSchemas["30000"];
  // Or add device-specific params
};

// Start with empty strings
const defaults: Record<string, string> = Object.fromEntries(
  Object.keys(paramSchemas).map((id) => [id, ""]),
);

// Override with factory defaults
Object.assign(defaults, {
  "2004": "connect.example.io",
  "2005": "11919",
});

export const fmmDevice: DeviceDefinition = {
  id: "fmm",
  name: "Teltonika FMM Series",
  vendorId: "teltonika",
  categories: teltonikaCategories,
  paramSchemas,
  defaults,
};
```

## Step 2: Register in the vendor's `mod.ts`

Add the device to the `devices` array and update `getParamSchema`:

```ts
import { fmmDevice } from "./devices/fmm.ts";

export const teltonikaPlugin: VendorPlugin = {
  // ... existing fields ...
  devices: [fmbDevice, fmcDevice, fmmDevice],

  getParamSchema: (deviceId: string, paramId: string): ParamSchema => {
    const device = [fmbDevice, fmcDevice, fmmDevice]
      .find((d) => d.id === deviceId);
    return device?.paramSchemas[paramId] ??
      buildFallbackSchema(paramId);
  },
};
```

## Step 3: Update device detection

In `detect.ts`, add logic to identify the new device:

```ts
export const detectDeviceFamily = (
  config: Record<string, string>,
): string => {
  if (config["99999"]) return "fmm"; // unique FMM param
  if (config["30000"]) return "fmc"; // CAN adapter = FMC
  return "fmb"; // default
};
```

### Detection Strategies

- **Unique parameters**: Check for a param ID that only exists on this device
- **Value patterns**: Check specific param values that indicate the device
- **Parameter count**: Some devices have more/fewer params
- **Default fallback**: Always have a sensible fallback device

## Step 4: Understand Device Compatibility

When a vendor has multiple devices, the UI shows **all** vendor parameters. This
is how it works:

1. `buildFullVendorConfig()` collects param IDs from **all** devices via
   `getAllVendorParamIds()`
2. Parameters in the selected device's `paramSchemas` are marked
   `compatible: true`
3. Parameters from other devices are marked `compatible: false`

### UI Behavior

| State        | Appearance                       | Editable | Included in Download |
| ------------ | -------------------------------- | -------- | -------------------- |
| Compatible   | Normal                           | Yes      | Yes                  |
| Incompatible | Greyed out, "incompatible" badge | No       | No                   |

### Sidebar Behavior

- Categories where **all** params are incompatible show an "N/A" badge
- The bottom bar shows compatible/incompatible counts

### Example

Teltonika FMB has 1,378 compatible + 150 incompatible = 1,528 total params.
Teltonika FMC has 1,528 all compatible (it's the superset device).

## Step 5: Device-Specific Categories

If the new device needs different categories, you can define device-specific
ones:

```ts
import { baseTeltonikaCategories } from "../categories.ts";

const fmmCategories = [
  ...baseTeltonikaCategories,
  {
    id: "bluetooth",
    label: "Bluetooth",
    icon: "📶",
    color: "bg-indigo-100 text-indigo-700",
    order: 20,
    deviceOnly: "fmm", // only shown for FMM
  },
];
```

The `deviceOnly` field on a `CategoryDef` indicates it should only appear for a
specific device variant.

## Step 6: Add tests

Test the new device's:

- **Default config** — all required params present
- **Schema coverage** — `paramSchemas` covers expected params
- **Detection** — `detectDevice()` returns the correct ID
- **Round-trip** — parse → generate → parse produces same config
- **Compatibility** — incompatible params are correctly identified

## Checklist

- [ ] `vendors/<vendor>/devices/<id>.ts` — device definition with paramSchemas
      and defaults
- [ ] `vendors/<vendor>/mod.ts` — add to `devices` array and `getParamSchema`
- [ ] `vendors/<vendor>/detect.ts` — detection logic for the new device
- [ ] Tests for defaults, schemas, detection, and compatibility
