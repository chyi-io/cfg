import type {
  VendorPlugin,
  DeviceDefinition,
  StructuredConfig,
} from "./types.ts";

/**
 * Internal store of registered vendor plugins, keyed by vendor ID.
 * @internal
 */
const _vendors = new Map<string, VendorPlugin>();

/**
 * Register a vendor plugin so it can be looked up and used for
 * auto-detection, parsing, and generation.
 *
 * @param plugin - The vendor plugin to register.
 * @throws If a vendor with the same ID is already registered.
 *
 * @example
 * ```ts
 * import { registerVendor } from "@/lib/registry.ts";
 * import { teltonikaPlugin } from "@/vendors/teltonika/mod.ts";
 * registerVendor(teltonikaPlugin);
 * ```
 */
export const registerVendor = (plugin: VendorPlugin): void => {
  if (_vendors.has(plugin.id)) {
    throw new Error(`Vendor "${plugin.id}" is already registered.`);
  }
  _vendors.set(plugin.id, plugin);
};

/**
 * Retrieve a registered vendor plugin by ID.
 *
 * @param id - Vendor identifier (e.g. "teltonika").
 * @returns The plugin, or `undefined` if not found.
 */
export const getVendor = (id: string): VendorPlugin | undefined =>
  _vendors.get(id);

/**
 * List all registered vendor plugins.
 *
 * @returns Array of all registered plugins.
 */
export const listVendors = (): VendorPlugin[] => [..._vendors.values()];

/**
 * Look up a specific device definition across all vendors.
 *
 * @param vendorId - Vendor identifier.
 * @param deviceId - Device identifier within the vendor.
 * @returns The device definition, or `undefined`.
 */
export const getDeviceDefinition = (
  vendorId: string,
  deviceId: string,
): DeviceDefinition | undefined => {
  const vendor = _vendors.get(vendorId);
  if (!vendor) return undefined;
  return vendor.devices.find((d) => d.id === deviceId);
};

/**
 * Result of auto-detecting a vendor and device from a file.
 */
export interface DetectionResult {
  readonly vendorId: string;
  readonly deviceId: string;
  readonly config: Record<string, string>;
}

/**
 * Attempt to auto-detect the vendor and device type from a raw file buffer.
 * Iterates through registered vendors, tries to parse the file, and if
 * successful, calls `detectDevice` to identify the hardware variant.
 *
 * @param buffer - Raw file bytes.
 * @param fileName - Original file name (used to filter by extension).
 * @returns Detection result, or `null` if no vendor could parse the file.
 *
 * @example
 * ```ts
 * const result = await detectVendorFromFile(fileBytes, "config.cfg");
 * if (result) {
 *   console.log(result.vendorId, result.deviceId);
 * }
 * ```
 */
export const detectVendorFromFile = async (
  buffer: Uint8Array,
  fileName: string,
): Promise<DetectionResult | null> => {
  const ext = fileName.includes(".")
    ? "." + fileName.split(".").pop()!.toLowerCase()
    : "";

  for (const vendor of _vendors.values()) {
    if (ext && !vendor.fileExtensions.includes(ext)) continue;

    try {
      const result = await vendor.parse(buffer);
      if (result.success && result.config) {
        const deviceId = vendor.detectDevice(result.config);
        return { vendorId: vendor.id, deviceId, config: result.config };
      }
    } catch {
      // This vendor can't parse the file — try the next one.
    }
  }

  return null;
};

/**
 * Build a structured config (grouped by category) using a vendor's
 * `categorizeParam` function.
 *
 * @param vendor - The vendor plugin.
 * @param config - Flat key-value config map.
 * @returns Config grouped by category key.
 */
export const buildStructuredConfig = (
  vendor: VendorPlugin,
  config: Record<string, string>,
): StructuredConfig => {
  const structured: StructuredConfig = {};

  for (const [key, value] of Object.entries(config)) {
    const paramId = parseInt(key);
    let category: string;
    if (!isNaN(paramId)) {
      category = vendor.categorizeParam(paramId);
    } else {
      // For non-numeric keys (e.g. INI-style), look up category from device schemas
      category = "other";
      for (const device of vendor.devices) {
        if (device.paramSchemas[key]) {
          category = device.paramSchemas[key].category;
          break;
        }
      }
    }
    if (!structured[category]) structured[category] = {};
    structured[category][key] = value;
  }

  return structured;
};

/**
 * Return the superset of all parameter IDs across every device of a vendor.
 * Used to show all possible params (compatible + incompatible) in the UI.
 *
 * @param vendor - The vendor plugin.
 * @returns Set of all known parameter IDs for this vendor.
 */
export const getAllVendorParamIds = (vendor: VendorPlugin): Set<string> => {
  const ids = new Set<string>();
  for (const device of vendor.devices) {
    for (const id of Object.keys(device.paramSchemas)) {
      ids.add(id);
    }
  }
  return ids;
};

/**
 * Clear all registered vendors. Primarily useful for testing.
 * @internal
 */
export const _clearVendors = (): void => {
  _vendors.clear();
};
