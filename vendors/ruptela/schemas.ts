import { z } from "zod";
import type { ParamOption, ParamSchema } from "../../lib/types.ts";
import { categorizeParam } from "./categories.ts";

// ── Reusable option sets ─────────────────────────────────────────────

const OPT_DISABLE_ENABLE: ParamOption[] = [
  { value: "0", label: "Disabled" },
  { value: "1", label: "Enabled" },
];

const OPT_PROTOCOL: ParamOption[] = [
  { value: "0", label: "TCP" },
  { value: "1", label: "UDP" },
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

/** @internal */
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

// ── ECO5 parameter definitions ───────────────────────────────────────
// Based on Ruptela Device Center documentation.
// These are stub definitions covering the major config categories.
// Actual parameter IDs will be refined when sample config files are available.

const _rawDefs: Record<string, RawDef> = {
  // ── System (1-99) ──
  "1": {
    name: "Device ID",
    type: "string",
    description: "Unique device identifier (IMEI)",
    category: "system",
    hint: "15-digit IMEI",
  },
  "2": {
    name: "Firmware Version",
    type: "string",
    description: "Current firmware version string",
    category: "system",
  },
  "3": {
    name: "Hardware Version",
    type: "string",
    description: "Hardware revision identifier",
    category: "system",
  },
  "10": {
    name: "Sleep Mode",
    type: "number",
    description: "Power saving sleep mode",
    category: "system",
    options: [
      { value: "0", label: "Disabled" },
      { value: "1", label: "GPS Sleep" },
      { value: "2", label: "Deep Sleep" },
    ],
  },
  "11": {
    name: "Sleep Timeout",
    type: "number",
    description: "Seconds of inactivity before entering sleep",
    category: "system",
    hint: "Seconds",
    min: 0,
    max: 65535,
  },
  "12": {
    name: "LED Mode",
    type: "number",
    description: "Status LED behavior",
    category: "system",
    options: OPT_DISABLE_ENABLE,
  },
  "13": {
    name: "Ignition Detection",
    type: "number",
    description: "How ignition is detected",
    category: "system",
    options: [
      { value: "0", label: "Power voltage" },
      { value: "1", label: "Digital input" },
      { value: "2", label: "Accelerometer" },
    ],
  },
  "14": {
    name: "Ignition Voltage High",
    type: "number",
    description: "Voltage threshold for ignition ON (mV)",
    category: "system",
    hint: "mV",
    min: 0,
    max: 32000,
  },
  "15": {
    name: "Ignition Voltage Low",
    type: "number",
    description: "Voltage threshold for ignition OFF (mV)",
    category: "system",
    hint: "mV",
    min: 0,
    max: 32000,
  },
  "20": {
    name: "Device Password",
    type: "string",
    description: "SMS/configuration command password",
    category: "system",
    hint: "Default: 000000",
  },

  // ── Connectivity (100-199) ──
  "100": {
    name: "APN Name",
    type: "string",
    description: "Mobile network Access Point Name",
    category: "connectivity",
    hint: "e.g. internet",
  },
  "101": {
    name: "APN Username",
    type: "string",
    description: "APN authentication username",
    category: "connectivity",
    hint: "Leave empty if not required",
  },
  "102": {
    name: "APN Password",
    type: "string",
    description: "APN authentication password",
    category: "connectivity",
    hint: "Leave empty if not required",
  },
  "110": {
    name: "Server IP/Domain",
    type: "string",
    description: "Primary server address",
    category: "connectivity",
    hint: "e.g. 192.168.1.1 or server.example.com",
  },
  "111": {
    name: "Server Port",
    type: "number",
    description: "Primary server port",
    category: "connectivity",
    hint: "1-65535",
    min: 1,
    max: 65535,
  },
  "112": {
    name: "Protocol",
    type: "number",
    description: "Transport protocol",
    category: "connectivity",
    options: OPT_PROTOCOL,
  },
  "115": {
    name: "Second Server IP",
    type: "string",
    description: "Backup server address",
    category: "connectivity",
    hint: "Failover server",
  },
  "116": {
    name: "Second Server Port",
    type: "number",
    description: "Backup server port",
    category: "connectivity",
    hint: "1-65535",
    min: 1,
    max: 65535,
  },
  "117": {
    name: "Second Server Protocol",
    type: "number",
    description: "Backup server protocol",
    category: "connectivity",
    options: OPT_PROTOCOL,
  },
  "118": {
    name: "Two Servers Mode",
    type: "number",
    description: "Enable dual server operation",
    category: "connectivity",
    options: OPT_DISABLE_ENABLE,
  },
  "120": {
    name: "Records per Send",
    type: "number",
    description: "Number of records per data packet",
    category: "connectivity",
    hint: "1-50",
    min: 1,
    max: 50,
  },
  "121": {
    name: "Send Period",
    type: "number",
    description: "Data transmission interval",
    category: "connectivity",
    hint: "Seconds. 0 = send immediately",
    min: 0,
    max: 65535,
  },
  "130": {
    name: "SMS Data Number",
    type: "string",
    description: "Phone number for SMS data sending",
    category: "connectivity",
    hint: "International format",
  },
  "131": {
    name: "SMS Data Enable",
    type: "number",
    description: "Enable SMS data fallback",
    category: "connectivity",
    options: OPT_DISABLE_ENABLE,
  },

  // ── Tracking (200-299) ──
  "200": {
    name: "On Stop Save Period",
    type: "number",
    description: "Record saving interval when stationary",
    category: "tracking",
    hint: "Seconds",
    min: 1,
    max: 65535,
  },
  "201": {
    name: "On Moving Save Period",
    type: "number",
    description: "Record saving interval when moving",
    category: "tracking",
    hint: "Seconds",
    min: 1,
    max: 65535,
  },
  "202": {
    name: "On Stop Send Period",
    type: "number",
    description: "Data send interval when stationary",
    category: "tracking",
    hint: "Seconds. 0 = use save period",
    min: 0,
    max: 65535,
  },
  "203": {
    name: "On Moving Send Period",
    type: "number",
    description: "Data send interval when moving",
    category: "tracking",
    hint: "Seconds. 0 = use save period",
    min: 0,
    max: 65535,
  },
  "210": {
    name: "Min Distance",
    type: "number",
    description: "Minimum distance between records",
    category: "tracking",
    hint: "Meters. 0 = disabled",
    min: 0,
    max: 65535,
  },
  "211": {
    name: "Min Angle",
    type: "number",
    description: "Minimum heading change to trigger record",
    category: "tracking",
    hint: "Degrees. 0 = disabled",
    min: 0,
    max: 360,
  },
  "212": {
    name: "Min Speed",
    type: "number",
    description: "Minimum speed for movement detection",
    category: "tracking",
    hint: "km/h",
    min: 0,
    max: 255,
  },
  "213": {
    name: "GNSS Source",
    type: "number",
    description: "GNSS constellation selection",
    category: "tracking",
    options: [
      { value: "0", label: "GPS only" },
      { value: "1", label: "GPS + GLONASS" },
      { value: "2", label: "All available" },
    ],
  },
  "220": {
    name: "Static Navigation",
    type: "number",
    description: "Filter out noise when stationary",
    category: "tracking",
    options: OPT_DISABLE_ENABLE,
  },
  "221": {
    name: "Static Nav Speed",
    type: "number",
    description: "Speed threshold for static mode",
    category: "tracking",
    hint: "km/h",
    min: 0,
    max: 255,
  },

  // ── I/O (300-399) ──
  "300": {
    name: "DIN1 Priority",
    type: "number",
    description: "Digital input 1 event priority",
    category: "io",
    options: [
      { value: "0", label: "Disabled" },
      { value: "1", label: "Low" },
      { value: "2", label: "High" },
      { value: "3", label: "Panic" },
    ],
  },
  "301": {
    name: "DIN1 Event",
    type: "number",
    description: "Digital input 1 event type",
    category: "io",
    options: [
      { value: "0", label: "On change" },
      { value: "1", label: "On low" },
      { value: "2", label: "On high" },
    ],
  },
  "310": {
    name: "DIN2 Priority",
    type: "number",
    description: "Digital input 2 event priority",
    category: "io",
    options: [
      { value: "0", label: "Disabled" },
      { value: "1", label: "Low" },
      { value: "2", label: "High" },
      { value: "3", label: "Panic" },
    ],
  },
  "311": {
    name: "DIN2 Event",
    type: "number",
    description: "Digital input 2 event type",
    category: "io",
    options: [
      { value: "0", label: "On change" },
      { value: "1", label: "On low" },
      { value: "2", label: "On high" },
    ],
  },
  "320": {
    name: "DOUT1 Default",
    type: "number",
    description: "Digital output 1 default state",
    category: "io",
    options: [
      { value: "0", label: "Off" },
      { value: "1", label: "On" },
    ],
  },
  "330": {
    name: "AIN1 Enable",
    type: "number",
    description: "Analog input 1 monitoring",
    category: "io",
    options: OPT_DISABLE_ENABLE,
  },
  "331": {
    name: "AIN1 Low Threshold",
    type: "number",
    description: "Analog input 1 low voltage threshold (mV)",
    category: "io",
    hint: "mV",
    min: 0,
    max: 32000,
  },
  "332": {
    name: "AIN1 High Threshold",
    type: "number",
    description: "Analog input 1 high voltage threshold (mV)",
    category: "io",
    hint: "mV",
    min: 0,
    max: 32000,
  },
  "340": {
    name: "Battery Voltage Priority",
    type: "number",
    description: "Internal battery voltage event priority",
    category: "io",
    options: [
      { value: "0", label: "Disabled" },
      { value: "1", label: "Low" },
      { value: "2", label: "High" },
    ],
  },
  "350": {
    name: "BLE Enable",
    type: "number",
    description: "Bluetooth Low Energy scanning",
    category: "io",
    options: OPT_DISABLE_ENABLE,
  },
  "351": {
    name: "BLE Scan Interval",
    type: "number",
    description: "BLE scan interval",
    category: "io",
    hint: "Seconds",
    min: 1,
    max: 65535,
  },

  // ── Geofence (400-499) ──
  "400": {
    name: "Geofence 1 Enable",
    type: "number",
    description: "Enable geofence zone 1",
    category: "geofence",
    options: OPT_DISABLE_ENABLE,
  },
  "401": {
    name: "Geofence 1 Shape",
    type: "number",
    description: "Zone 1 shape",
    category: "geofence",
    options: [
      { value: "0", label: "Circle" },
      { value: "1", label: "Polygon" },
    ],
  },
  "402": {
    name: "Geofence 1 Latitude",
    type: "string",
    description: "Zone 1 center latitude",
    category: "geofence",
    hint: "Decimal degrees",
  },
  "403": {
    name: "Geofence 1 Longitude",
    type: "string",
    description: "Zone 1 center longitude",
    category: "geofence",
    hint: "Decimal degrees",
  },
  "404": {
    name: "Geofence 1 Radius",
    type: "number",
    description: "Zone 1 radius",
    category: "geofence",
    hint: "Meters",
    min: 50,
    max: 100000,
  },
  "405": {
    name: "Geofence 1 Event",
    type: "number",
    description: "Zone 1 event type",
    category: "geofence",
    options: [
      { value: "0", label: "On enter" },
      { value: "1", label: "On exit" },
      { value: "2", label: "Both" },
    ],
  },
  "410": {
    name: "Geofence 2 Enable",
    type: "number",
    description: "Enable geofence zone 2",
    category: "geofence",
    options: OPT_DISABLE_ENABLE,
  },
  "411": {
    name: "Geofence 2 Shape",
    type: "number",
    description: "Zone 2 shape",
    category: "geofence",
    options: [
      { value: "0", label: "Circle" },
      { value: "1", label: "Polygon" },
    ],
  },
  "412": {
    name: "Geofence 2 Latitude",
    type: "string",
    description: "Zone 2 center latitude",
    category: "geofence",
    hint: "Decimal degrees",
  },
  "413": {
    name: "Geofence 2 Longitude",
    type: "string",
    description: "Zone 2 center longitude",
    category: "geofence",
    hint: "Decimal degrees",
  },
  "414": {
    name: "Geofence 2 Radius",
    type: "number",
    description: "Zone 2 radius",
    category: "geofence",
    hint: "Meters",
    min: 50,
    max: 100000,
  },
  "415": {
    name: "Geofence 2 Event",
    type: "number",
    description: "Zone 2 event type",
    category: "geofence",
    options: [
      { value: "0", label: "On enter" },
      { value: "1", label: "On exit" },
      { value: "2", label: "Both" },
    ],
  },
};

/**
 * All ECO5 parameter schemas, converted from raw definitions to Zod-powered ParamSchema.
 */
export const eco5ParamSchemas: Record<string, ParamSchema> = Object.fromEntries(
  Object.entries(_rawDefs).map(([id, d]) => [id, toParamSchema(id, d)]),
);

/**
 * Build a fallback ParamSchema for unknown Ruptela parameters.
 */
export const buildFallbackSchema = (paramId: string): ParamSchema => {
  const id = parseInt(paramId);
  const category = isNaN(id) ? "other" : categorizeParam(id);
  return toParamSchema(paramId, {
    name: `Param ${paramId}`,
    type: "string",
    description: `Ruptela parameter ${paramId}`,
    category,
  });
};
