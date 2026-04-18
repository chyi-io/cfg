import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.216.0/assert/mod.ts";
import {
  _clearVendors,
  buildStructuredConfig,
  detectVendorFromFile,
  getDeviceDefinition,
  getVendor,
  listVendors,
  registerVendor,
} from "../lib/registry.ts";
import { teltonikaPlugin } from "../vendors/teltonika/mod.ts";
import { ruptelaPlugin } from "../vendors/ruptela/mod.ts";
import { chafonPlugin } from "../vendors/chafon/mod.ts";

// Reset registry before each test group
const setup = () => {
  _clearVendors();
  registerVendor(teltonikaPlugin);
  registerVendor(ruptelaPlugin);
  registerVendor(chafonPlugin);
};

Deno.test("registerVendor — registers vendors without error", () => {
  _clearVendors();
  registerVendor(teltonikaPlugin);
  registerVendor(ruptelaPlugin);
  registerVendor(chafonPlugin);
  assertEquals(listVendors().length, 3);
});

Deno.test("registerVendor — throws on duplicate", () => {
  _clearVendors();
  registerVendor(teltonikaPlugin);
  let threw = false;
  try {
    registerVendor(teltonikaPlugin);
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});

Deno.test("getVendor — retrieves registered vendor", () => {
  setup();
  const vendor = getVendor("teltonika");
  assertExists(vendor);
  assertEquals(vendor.id, "teltonika");
});

Deno.test("getVendor — returns undefined for unknown vendor", () => {
  setup();
  assertEquals(getVendor("nonexistent"), undefined);
});

Deno.test("getDeviceDefinition — finds device", () => {
  setup();
  const fmb = getDeviceDefinition("teltonika", "fmb");
  assertExists(fmb);
  assertEquals(fmb.id, "fmb");
  assertEquals(fmb.vendorId, "teltonika");
});

Deno.test("getDeviceDefinition — returns undefined for bad device", () => {
  setup();
  assertEquals(getDeviceDefinition("teltonika", "xyz"), undefined);
});

Deno.test("getDeviceDefinition — returns undefined for bad vendor", () => {
  setup();
  assertEquals(getDeviceDefinition("nonexistent", "fmb"), undefined);
});

Deno.test("buildStructuredConfig — groups params by category", () => {
  setup();
  const vendor = getVendor("teltonika")!;
  const config = { "2001": "internet", "2005": "5027", "1000": "30" };
  const structured = buildStructuredConfig(vendor, config);

  assertExists(structured["gprs_server"]);
  assertEquals(structured["gprs_server"]["2001"], "internet");
  assertEquals(structured["gprs_server"]["2005"], "5027");

  assertExists(structured["data_acquisition"]);
  assertEquals(structured["data_acquisition"]["1000"], "30");
});

Deno.test("detectVendorFromFile — detects Teltonika .cfg", async () => {
  setup();
  // Build a minimal Teltonika config and generate a .cfg file
  const vendor = getVendor("teltonika")!;
  const config = { "801": "FMB120", "2001": "internet" };
  const buffer = await vendor.generate(config);

  const result = await detectVendorFromFile(buffer, "test.cfg");
  assertExists(result);
  assertEquals(result.vendorId, "teltonika");
  assertEquals(result.config["801"], "FMB120");
});

Deno.test("detectVendorFromFile — detects Ruptela .txt", async () => {
  setup();
  const content = "[RUPTELA ECO5]\n100=internet\n111=9988\n";
  const buffer = new TextEncoder().encode(content);

  const result = await detectVendorFromFile(buffer, "config.txt");
  assertExists(result);
  assertEquals(result.vendorId, "ruptela");
  assertEquals(result.config["100"], "internet");
});

Deno.test("detectVendorFromFile — detects Chafon .ini", async () => {
  setup();
  const content = "[Basic]\nBaud=9600\nPower=33\n[Antenna]\nAnt1=True\n";
  const buffer = new TextEncoder().encode(content);

  const result = await detectVendorFromFile(buffer, "config.ini");
  assertExists(result);
  assertEquals(result.vendorId, "chafon");
  assertEquals(result.config["Baud"], "9600");
  assertEquals(result.deviceId, "m_series");
});

Deno.test("buildStructuredConfig — handles non-numeric keys (Chafon)", () => {
  setup();
  const vendor = getVendor("chafon")!;
  const config = {
    "Baud": "9600",
    "Power": "33",
    "Ant1": "True",
    "IsEnable": "True",
  };
  const structured = buildStructuredConfig(vendor, config);

  assertExists(structured["basic"]);
  assertEquals(structured["basic"]["Baud"], "9600");
  assertEquals(structured["basic"]["Power"], "33");

  assertExists(structured["antenna"]);
  assertEquals(structured["antenna"]["Ant1"], "True");

  assertExists(structured["remote"]);
  assertEquals(structured["remote"]["IsEnable"], "True");
});

Deno.test("getDeviceDefinition — finds Chafon m_series", () => {
  setup();
  const device = getDeviceDefinition("chafon", "m_series");
  assertExists(device);
  assertEquals(device.id, "m_series");
  assertEquals(device.vendorId, "chafon");
});

Deno.test("detectVendorFromFile — returns null for unknown file", async () => {
  setup();
  const buffer = new TextEncoder().encode("random garbage data");
  const result = await detectVendorFromFile(buffer, "test.xyz");
  assertEquals(result, null);
});
