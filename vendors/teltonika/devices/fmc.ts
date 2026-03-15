import type { DeviceDefinition } from "../../../lib/types.ts";
import { fmcCategories } from "../categories.ts";
import { toParamSchema } from "../schemas.ts";
import { staticDefs } from "../params_static.ts";
import { generatePatternDefs } from "../params_pattern.ts";

const allRawDefs = { ...staticDefs, ...generatePatternDefs() };

const paramSchemas = Object.fromEntries(
  Object.entries(allRawDefs).map(([id, d]) => [id, toParamSchema(id, d)]),
);

/** Hand-picked non-empty defaults for common params. */
const explicitDefaults: Record<string, string> = {
  "2001": "internet",
  "2004": "",
  "2005": "5027",
  "2006": "0",
  "1000": "30",
  "1001": "100",
  "1002": "10",
  "3000": "0",
  "3005": "1",
  "3006": "0",
  "801": "FMC130",
};

/** Full defaults: every known param with empty string unless explicitly set. */
const defaults: Record<string, string> = Object.fromEntries(
  Object.keys(paramSchemas).map((id) => [id, explicitDefaults[id] ?? ""]),
);

/**
 * Teltonika FMC series device definition.
 * Covers FMC125, FMC130, FMC150, FMC640, FMC880, etc.
 * Includes all FMB categories plus CAN Adapter and OBD PIDs.
 */
export const fmcDevice: DeviceDefinition = {
  id: "fmc",
  name: "Teltonika FMC Series",
  vendorId: "teltonika",
  categories: fmcCategories,
  paramSchemas,
  defaults,
};
