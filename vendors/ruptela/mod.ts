import type { ParamSchema, VendorPlugin } from "../../lib/types.ts";
import { generateRuptelaConfig, parseRuptelaConfig } from "./parser.ts";
import { detectRuptelaDevice } from "./detect.ts";
import { categorizeParam } from "./categories.ts";
import { buildFallbackSchema } from "./schemas.ts";
import { eco5Device } from "./devices/eco5.ts";

/**
 * Ruptela vendor plugin.
 * Currently supports ECO5 device with text-based config format (stub).
 *
 * @example
 * ```ts
 * import { registerVendor } from "@/lib/registry.ts";
 * import { ruptelaPlugin } from "@/vendors/ruptela/mod.ts";
 * registerVendor(ruptelaPlugin);
 * ```
 */
export const ruptelaPlugin: VendorPlugin = {
  id: "ruptela",
  name: "Ruptela",
  fileExtensions: [".rcfg", ".txt"],
  devices: [eco5Device],

  parse: parseRuptelaConfig,
  generate: generateRuptelaConfig,
  detectDevice: detectRuptelaDevice,
  categorizeParam,

  getParamSchema: (_deviceId: string, paramId: string): ParamSchema => {
    return eco5Device.paramSchemas[paramId] ?? buildFallbackSchema(paramId);
  },
};
