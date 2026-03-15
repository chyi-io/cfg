import { z } from "zod";
import type { ParamOption, ParamSchema } from "../../lib/types.ts";

// ── Reusable option sets ─────────────────────────────────────────────

const OPT_BOOL: ParamOption[] = [
  { value: "True", label: "Enabled" },
  { value: "False", label: "Disabled" },
];

const OPT_REGION: ParamOption[] = [
  { value: "USA", label: "USA (FCC)" },
  { value: "EU", label: "Europe (ETSI)" },
  { value: "China", label: "China" },
  { value: "Korea", label: "Korea" },
];

const OPT_WORKMODE: ParamOption[] = [
  { value: "Active Mode", label: "Active Mode" },
  { value: "Trigger Mode", label: "Trigger Mode" },
];

const OPT_PORT: ParamOption[] = [
  { value: "RJ45", label: "RJ45 (Ethernet)" },
  { value: "RS232", label: "RS232 (Serial)" },
  { value: "RS485", label: "RS485" },
  { value: "USB", label: "USB" },
  { value: "Wiegand", label: "Wiegand" },
];

const OPT_AREA: ParamOption[] = [
  { value: "EPC", label: "EPC" },
  { value: "TID", label: "TID" },
  { value: "User", label: "User" },
];

const OPT_SESSION: ParamOption[] = [
  { value: "S0", label: "S0" },
  { value: "S1", label: "S1" },
  { value: "S2", label: "S2" },
  { value: "S3", label: "S3" },
];

const OPT_WIEGAND_MODE: ParamOption[] = [
  { value: "WG26", label: "Wiegand 26-bit" },
  { value: "WG34", label: "Wiegand 34-bit" },
];

const OPT_WIEGAND_OUT: ParamOption[] = [
  { value: "Low Bytes Are Output First", label: "Low Bytes First" },
  { value: "High Bytes Are Output First", label: "High Bytes First" },
];

const OPT_BAUD: ParamOption[] = [
  { value: "9600", label: "9600" },
  { value: "19200", label: "19200" },
  { value: "38400", label: "38400" },
  { value: "57600", label: "57600" },
  { value: "115200", label: "115200" },
];

const OPT_PROTOCOL_TYPE: ParamOption[] = [
  { value: "Modbus RTU", label: "Modbus RTU" },
  { value: "Modbus TCP", label: "Modbus TCP" },
];

const OPT_CONDITION: ParamOption[] = [
  { value: "The password or mask is eligible", label: "Password or mask eligible" },
  { value: "The password and mask are eligible", label: "Password and mask eligible" },
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

// ── Chafon M-Series UHF Reader parameter definitions ────────────────

const _rawDefs: Record<string, RawDef> = {
  // ── Basic ──
  "Baud": { name: "Baud Rate", type: "number", description: "Serial communication baud rate", category: "basic", options: OPT_BAUD },
  "Power": { name: "RF Power", type: "number", description: "Transmit power in dBm (0-33)", category: "basic", hint: "dBm", min: 0, max: 33 },
  "Addr": { name: "Reader Address", type: "number", description: "Device address for multi-reader setups", category: "basic", hint: "0-255", min: 0, max: 255 },
  "Region": { name: "Frequency Region", type: "string", description: "Regulatory frequency region", category: "basic", options: OPT_REGION },
  "StartFreq": { name: "Start Frequency", type: "string", description: "Start frequency in MHz", category: "basic", hint: "MHz (e.g. 902.750)" },
  "EndFreq": { name: "End Frequency", type: "string", description: "End frequency in MHz", category: "basic", hint: "MHz (e.g. 926.750)" },
  "IsPointFreq": { name: "Point Frequency", type: "string", description: "Use single point frequency instead of range", category: "basic", options: OPT_BOOL },
  "Workmode": { name: "Work Mode", type: "string", description: "Reader operating mode", category: "basic", options: OPT_WORKMODE },
  "Port": { name: "Communication Port", type: "string", description: "Primary communication interface", category: "basic", options: OPT_PORT },
  "Area": { name: "Tag Memory Area", type: "string", description: "RFID tag memory area to read", category: "basic", options: OPT_AREA },
  "Startaddr": { name: "Start Address", type: "number", description: "Memory start address (word offset)", category: "basic", hint: "Word offset", min: 0 },
  "DataLen": { name: "Data Length", type: "number", description: "Number of words to read from tag", category: "basic", hint: "Words", min: 1, max: 32 },
  "Filtertime": { name: "Filter Time", type: "number", description: "Duplicate tag filter time in seconds", category: "basic", hint: "Seconds", min: 0, max: 255 },
  "Triggletime": { name: "Trigger Time", type: "number", description: "Trigger mode timeout in seconds", category: "basic", hint: "Seconds", min: 0, max: 255 },
  "Q": { name: "Q Value", type: "number", description: "Anti-collision Q parameter (higher = more tags)", category: "basic", hint: "0-15", min: 0, max: 15 },
  "Session": { name: "Session", type: "string", description: "Gen2 inventory session", category: "basic", options: OPT_SESSION },
  "WiegandMode": { name: "Wiegand Mode", type: "string", description: "Wiegand output bit format", category: "basic", options: OPT_WIEGAND_MODE },
  "WieggendOutMode": { name: "Wiegand Output Mode", type: "string", description: "Wiegand byte output order", category: "basic", options: OPT_WIEGAND_OUT },
  "IntenelTime(*100mS)": { name: "Interval Time", type: "number", description: "Inventory interval in 100ms units (0 = continuous)", category: "basic", hint: "x100ms (0 = continuous)", min: 0 },
  "IsBuzzer": { name: "Buzzer", type: "string", description: "Enable/disable buzzer on tag read", category: "basic", options: OPT_BOOL },

  // ── Antenna ──
  "Ant1": { name: "Antenna 1 Enable", type: "string", description: "Enable antenna port 1", category: "antenna", options: OPT_BOOL },
  "AntPower1": { name: "Antenna 1 Power", type: "number", description: "Transmit power for antenna 1 (dBm)", category: "antenna", hint: "dBm", min: 0, max: 33 },
  "Ant2": { name: "Antenna 2 Enable", type: "string", description: "Enable antenna port 2", category: "antenna", options: OPT_BOOL },
  "AntPower2": { name: "Antenna 2 Power", type: "number", description: "Transmit power for antenna 2 (dBm)", category: "antenna", hint: "dBm", min: 0, max: 33 },
  "Ant3": { name: "Antenna 3 Enable", type: "string", description: "Enable antenna port 3", category: "antenna", options: OPT_BOOL },
  "AntPower3": { name: "Antenna 3 Power", type: "number", description: "Transmit power for antenna 3 (dBm)", category: "antenna", hint: "dBm", min: 0, max: 33 },
  "Ant4": { name: "Antenna 4 Enable", type: "string", description: "Enable antenna port 4", category: "antenna", options: OPT_BOOL },
  "AntPower4": { name: "Antenna 4 Power", type: "number", description: "Transmit power for antenna 4 (dBm)", category: "antenna", hint: "dBm", min: 0, max: 33 },

  // ── Advanced ──
  "PasswordEnable": { name: "Password Enable", type: "string", description: "Enable access password for tag operations", category: "advanced", options: OPT_BOOL },
  "PasswordHEX": { name: "Password (HEX)", type: "string", description: "4-byte access password in hex", category: "advanced", hint: "e.g. FF FF FF FF" },
  "MaskEnabled": { name: "Mask Enable", type: "string", description: "Enable tag mask filtering", category: "advanced", options: OPT_BOOL },
  "StartAddr": { name: "Mask Start Address", type: "number", description: "Mask filter start bit address", category: "advanced", min: 0 },
  "MaskLen": { name: "Mask Length", type: "number", description: "Mask filter bit length", category: "advanced", min: 0 },
  "MaskData": { name: "Mask Data", type: "string", description: "Mask filter data (hex)", category: "advanced", hint: "Hex bytes" },
  "Condition": { name: "Filter Condition", type: "string", description: "Password/mask filter condition", category: "advanced", options: OPT_CONDITION },
  "ConditionIndex": { name: "Condition Index", type: "number", description: "Filter condition index", category: "advanced", min: 0 },
  "ProtocolEnable": { name: "Protocol Enable", type: "string", description: "Enable protocol mode (Modbus)", category: "advanced", options: OPT_BOOL },
  "ProrocolType": { name: "Protocol Type", type: "string", description: "Communication protocol type", category: "advanced", options: OPT_PROTOCOL_TYPE },
  "ProrocolTypeIndex": { name: "Protocol Type Index", type: "number", description: "Protocol type selection index", category: "advanced", min: 0 },
  "CacheEnable": { name: "Cache Enable", type: "string", description: "Enable tag data caching", category: "advanced", options: OPT_BOOL },

  // ── Remote ──
  "IsEnable": { name: "Remote Enable", type: "string", description: "Enable remote TCP connection", category: "remote", options: OPT_BOOL },
  "RemoteIP": { name: "Remote IP", type: "string", description: "Remote server IP address", category: "remote", hint: "e.g. 192.168.1.100" },
  "RemotePort": { name: "Remote Port", type: "number", description: "Remote server TCP port", category: "remote", hint: "1-65535", min: 1, max: 65535 },
  "HeartbeatTime": { name: "Heartbeat Time", type: "number", description: "TCP heartbeat interval in seconds", category: "remote", hint: "Seconds", min: 0, max: 65535 },
};

/**
 * All Chafon M-Series parameter schemas.
 */
export const mSeriesParamSchemas: Record<string, ParamSchema> = Object.fromEntries(
  Object.entries(_rawDefs).map(([id, d]) => [id, toParamSchema(id, d)]),
);

/**
 * Build a fallback ParamSchema for unknown Chafon parameters.
 */
export const buildFallbackSchema = (paramId: string): ParamSchema =>
  toParamSchema(paramId, {
    name: paramId,
    type: "string",
    description: `Chafon parameter: ${paramId}`,
    category: "other",
  });
