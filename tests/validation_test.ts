import { assertEquals } from "https://deno.land/std@0.216.0/assert/mod.ts";
import {
  serializeAllParamMetas,
  serializeParamMeta,
  validateConfig,
  validateParam,
} from "../lib/validation.ts";
import {
  _clearVendors,
  getDeviceDefinition,
  getVendor,
  registerVendor,
} from "../lib/registry.ts";
import { teltonikaPlugin } from "../vendors/teltonika/mod.ts";

const setup = () => {
  _clearVendors();
  registerVendor(teltonikaPlugin);
};

Deno.test("validateParam — empty string is valid", () => {
  setup();
  const vendor = getVendor("teltonika")!;
  const schema = vendor.getParamSchema("fmb", "2005");
  const result = validateParam(schema, "");
  assertEquals(result.valid, true);
});

Deno.test("validateParam — valid number in range", () => {
  setup();
  const vendor = getVendor("teltonika")!;
  const schema = vendor.getParamSchema("fmb", "2005");
  const result = validateParam(schema, "5027");
  assertEquals(result.valid, true);
});

Deno.test("validateParam — valid enum value", () => {
  setup();
  const vendor = getVendor("teltonika")!;
  const schema = vendor.getParamSchema("fmb", "2006");
  assertEquals(validateParam(schema, "0").valid, true);
  assertEquals(validateParam(schema, "1").valid, true);
});

Deno.test("validateParam — invalid enum value", () => {
  setup();
  const vendor = getVendor("teltonika")!;
  const schema = vendor.getParamSchema("fmb", "2006");
  const result = validateParam(schema, "99");
  assertEquals(result.valid, false);
});

Deno.test("validateConfig — returns empty for valid config", () => {
  setup();
  const vendor = getVendor("teltonika")!;
  const deviceDef = getDeviceDefinition("teltonika", "fmb")!;
  const config = { "2001": "internet", "2006": "0", "3005": "1" };
  const errors = validateConfig(vendor, deviceDef, config);
  assertEquals(Object.keys(errors).length, 0);
});

Deno.test("validateConfig — reports invalid values", () => {
  setup();
  const vendor = getVendor("teltonika")!;
  const deviceDef = getDeviceDefinition("teltonika", "fmb")!;
  const config = { "2006": "99" };
  const errors = validateConfig(vendor, deviceDef, config);
  assertEquals(Object.keys(errors).length > 0, true);
  assertEquals(typeof errors["2006"], "string");
});

Deno.test("serializeParamMeta — produces serializable object", () => {
  setup();
  const vendor = getVendor("teltonika")!;
  const schema = vendor.getParamSchema("fmb", "2005");
  const meta = serializeParamMeta(schema);
  assertEquals(meta.id, "2005");
  assertEquals(meta.name, "Server Port");
  assertEquals(typeof meta.description, "string");
  assertEquals(meta.type === "string" || meta.type === "number", true);
});

Deno.test("serializeAllParamMetas — covers all config keys", () => {
  setup();
  const vendor = getVendor("teltonika")!;
  const deviceDef = getDeviceDefinition("teltonika", "fmb")!;
  const config = { "2001": "internet", "2005": "5027", "1000": "30" };
  const metas = serializeAllParamMetas(vendor, deviceDef, config);
  assertEquals(Object.keys(metas).length, 3);
  assertEquals(metas["2001"].id, "2001");
  assertEquals(metas["2005"].id, "2005");
  assertEquals(metas["1000"].id, "1000");
});
