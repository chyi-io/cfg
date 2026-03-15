import type { VendorPlugin, ParamSchema } from "../../lib/types.ts";
import { parseChafonConfig, generateChafonConfig } from "./parser.ts";
import { detectChafonDevice } from "./detect.ts";
import { categorizeParam } from "./categories.ts";
import { buildFallbackSchema } from "./schemas.ts";
import { mSeriesDevice } from "./devices/m_series.ts";

/**
 * Chafon vendor plugin.
 * Supports UHF RFID Reader M-Series with INI-based config format.
 */
export const chafonPlugin: VendorPlugin = {
  id: "chafon",
  name: "Chafon",
  fileExtensions: [".ini"],
  devices: [mSeriesDevice],

  parse: parseChafonConfig,
  generate: generateChafonConfig,
  detectDevice: detectChafonDevice,
  categorizeParam,

  getParamSchema: (_deviceId: string, paramId: string): ParamSchema =>
    mSeriesDevice.paramSchemas[paramId] ?? buildFallbackSchema(paramId),
};
