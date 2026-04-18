import { assertEquals } from "https://deno.land/std@0.216.0/assert/mod.ts";
import { mSeriesParamSchemas } from "../../vendors/chafon/schemas.ts";
import { validateParam } from "../../lib/validation.ts";

// ── Schema presence ──────────────────────────────────────────────────

Deno.test("[chafon] mSeriesParamSchemas has all 44 expected keys", () => {
  const count = Object.keys(mSeriesParamSchemas).length;
  assertEquals(count, 44, `Expected 44 schemas, got ${count}`);
});

// ── Valid values pass Zod ────────────────────────────────────────────

const VALID_VALUES: [string, string][] = [
  ["Baud", "9600"],
  ["Baud", "115200"],
  ["Power", "0"],
  ["Power", "33"],
  ["Addr", "1"],
  ["Addr", "255"],
  ["Region", "USA"],
  ["Region", "EU"],
  ["Workmode", "Active Mode"],
  ["Workmode", "Trigger Mode"],
  ["Port", "RJ45"],
  ["Area", "EPC"],
  ["Q", "4"],
  ["Q", "0"],
  ["Q", "15"],
  ["Session", "S0"],
  ["Session", "S3"],
  ["WiegandMode", "WG26"],
  ["WieggendOutMode", "Low Bytes Are Output First"],
  ["IsBuzzer", "True"],
  ["IsBuzzer", "False"],
  ["Ant1", "True"],
  ["AntPower1", "33"],
  ["AntPower2", "0"],
  ["PasswordEnable", "False"],
  ["MaskEnabled", "False"],
  ["Condition", "The password or mask is eligible"],
  ["ProtocolEnable", "False"],
  ["ProrocolType", "Modbus RTU"],
  ["CacheEnable", "False"],
  ["IsEnable", "True"],
  ["RemotePort", "1801"],
  ["RemotePort", "65535"],
  ["HeartbeatTime", "232"],
  ["DataLen", "12"],
  ["Filtertime", "3"],
  ["Triggletime", "3"],
  ["IntenelTime(*100mS)", "0"],
];

for (const [paramId, value] of VALID_VALUES) {
  Deno.test(`[chafon] schema validates: ${paramId}=${value} → valid`, () => {
    const schema = mSeriesParamSchemas[paramId];
    const result = validateParam(schema, value);
    assertEquals(result.valid, true, `${paramId}=${value} should be valid`);
  });
}

// ── Invalid values fail Zod ──────────────────────────────────────────

const INVALID_VALUES: [string, string][] = [
  ["Baud", "12345"], // Not in baud options
  ["Region", "Mars"], // Not a valid region
  ["Power", "50"], // Exceeds max 33
  ["Power", "-1"], // Below min 0
  ["Q", "16"], // Exceeds max 15
  ["RemotePort", "0"], // Below min 1
  ["RemotePort", "70000"], // Exceeds max 65535
  ["Workmode", "Sleep"], // Not a valid mode
  ["Session", "S5"], // Not a valid session
  ["Ant1", "Maybe"], // Not True/False
  ["DataLen", "0"], // Below min 1
  ["DataLen", "33"], // Exceeds max 32
];

for (const [paramId, value] of INVALID_VALUES) {
  Deno.test(`[chafon] schema rejects: ${paramId}=${value} → invalid`, () => {
    const schema = mSeriesParamSchemas[paramId];
    const result = validateParam(schema, value);
    assertEquals(result.valid, false, `${paramId}=${value} should be invalid`);
  });
}

// ── Empty strings are valid (field not filled) ───────────────────────

Deno.test("[chafon] empty strings pass validation", () => {
  for (const [paramId, schema] of Object.entries(mSeriesParamSchemas)) {
    const result = validateParam(schema, "");
    assertEquals(result.valid, true, `${paramId} with empty value should pass`);
  }
});
