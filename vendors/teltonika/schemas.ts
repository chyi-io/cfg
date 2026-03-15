import { z } from "zod";
import type { ParamOption, ParamSchema } from "../../lib/types.ts";
import { categorizeParam } from "./categories.ts";

// ── Reusable option sets ─────────────────────────────────────────────

/** @internal */
export const OPT_DISABLE_ENABLE: ParamOption[] = [
  { value: "0", label: "Disabled" },
  { value: "1", label: "Enabled" },
];

/** @internal */
export const OPT_IO_PRIORITY: ParamOption[] = [
  { value: "0", label: "Disabled" },
  { value: "1", label: "Low priority" },
  { value: "2", label: "High priority" },
  { value: "3", label: "Panic / SOS" },
];

/** @internal */
export const OPT_OPERAND: ParamOption[] = [
  { value: "0", label: "On exit" },
  { value: "1", label: "On entrance" },
  { value: "2", label: "On both" },
  { value: "3", label: "Monitoring" },
  { value: "4", label: "On hysteresis" },
  { value: "5", label: "On change" },
  { value: "6", label: "On delta change" },
];

// ── Zod schema builders ──────────────────────────────────────────────

const zStr = () => z.string();
const zNum = (min?: number, max?: number) => {
  let s = z.coerce.number();
  if (min !== undefined) s = s.min(min);
  if (max !== undefined) s = s.max(max);
  return s;
};
const zEnum = (opts: readonly ParamOption[]) =>
  z.enum(opts.map((o) => o.value) as [string, ...string[]]);

// ── Raw definition interface (internal, converted to ParamSchema) ────

/** @internal */
export interface RawDef {
  name: string;
  type: "number" | "string";
  description: string;
  category: string;
  options?: ParamOption[];
  hint?: string;
  min?: number;
  max?: number;
}

/**
 * Convert a RawDef to a Zod-powered ParamSchema.
 * @internal
 */
export const toParamSchema = (id: string, d: RawDef): ParamSchema => {
  let zodSchema: z.ZodType;
  if (d.options && d.options.length > 0) {
    zodSchema = zEnum(d.options);
  } else if (d.type === "number") {
    zodSchema = zNum(d.min, d.max);
  } else {
    zodSchema = zStr();
  }
  return {
    id,
    name: d.name,
    description: d.description,
    category: d.category,
    zodSchema,
    hint: d.hint,
    options: d.options,
    min: d.min,
    max: d.max,
  };
};

/**
 * Build a fallback ParamSchema for parameters not explicitly defined.
 *
 * @param paramId - The parameter ID string.
 * @returns A best-effort ParamSchema using ID range heuristics.
 */
export const buildFallbackSchema = (paramId: string): ParamSchema => {
  const id = parseInt(paramId);
  if (isNaN(id)) {
    return toParamSchema(paramId, {
      name: `Param ${paramId}`,
      type: "string",
      description: "Unknown parameter",
      category: "other",
    });
  }

  const category = categorizeParam(id);

  if (id >= 20000 && id <= 29999) {
    const offset = id - 20000;
    const block = Math.floor(offset / 100);
    const idx = offset % 100;
    return toParamSchema(paramId, {
      name: `Accel Block ${block}: Param ${idx}`,
      type: "number",
      description: `Accelerometer calibration block ${block}, index ${idx}`,
      category,
    });
  }
  if (id >= 30000 && id <= 49999) {
    return toParamSchema(paramId, {
      name: `CAN Adapter #${id}`,
      type: "string",
      description: `CAN adapter parameter ${id}`,
      category,
      hint: "CAN bus configuration value",
    });
  }
  if (id >= 50000) {
    const obdBase = id - 50000;
    const group = Math.floor(obdBase / 100);
    const idx = obdBase % 100;
    return toParamSchema(paramId, {
      name: `OBD PID Group ${group}: Param ${idx}`,
      type: "string",
      description: `OBD-II PID group ${group} parameter`,
      category,
      hint: "OBD diagnostic value",
    });
  }

  const catLabels: Record<string, string> = {
    system: "System", gprs_server: "GPRS / Server", network: "Network",
    data_acquisition: "Data Acquisition", io_elements: "I/O Elements",
    io_settings: "I/O Settings", scenario_io: "Scenario / IO",
    device_behavior: "Device Behavior", sms_data_sending: "SMS / Data",
    features: "Features", obd_can: "OBD / CAN", bluetooth: "Bluetooth",
    authorized_numbers: "Auth Numbers", trip_odometer: "Trip / Odometer",
    accelerometer: "Accelerometer", can_adapter: "CAN Adapter",
    obd_pids: "OBD PIDs", advanced: "Advanced", other: "Other",
  };
  const label = catLabels[category] || "Other";

  return toParamSchema(paramId, {
    name: `${label} #${paramId}`,
    type: "string",
    description: `${label} parameter ${paramId}`,
    category,
  });
};
