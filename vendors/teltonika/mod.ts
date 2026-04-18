import type { ParamSchema, VendorPlugin } from "../../lib/types.ts";
import { generateCfgFile, parseCfgFile } from "./parser.ts";
import { detectDeviceFamily } from "./detect.ts";
import { categorizeParam } from "./categories.ts";
import { buildFallbackSchema } from "./schemas.ts";
import { fmbDevice } from "./devices/fmb.ts";
import { fmcDevice } from "./devices/fmc.ts";

/**
 * Teltonika vendor plugin.
 * Supports FMB and FMC device families with gzip-compressed `.cfg` files.
 *
 * @example
 * ```ts
 * import { registerVendor } from "@/lib/registry.ts";
 * import { teltonikaPlugin } from "@/vendors/teltonika/mod.ts";
 * registerVendor(teltonikaPlugin);
 * ```
 */
export const teltonikaPlugin: VendorPlugin = {
  id: "teltonika",
  name: "Teltonika",
  fileExtensions: [".cfg"],
  devices: [fmbDevice, fmcDevice],

  parse: parseCfgFile,
  generate: generateCfgFile,
  detectDevice: detectDeviceFamily,
  categorizeParam,

  getParamSchema: (deviceId: string, paramId: string): ParamSchema => {
    const device = deviceId === "fmc" ? fmcDevice : fmbDevice;
    return device.paramSchemas[paramId] ?? buildFallbackSchema(paramId);
  },
};
