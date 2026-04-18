import {
  assert,
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.216.0/assert/mod.ts";
import {
  generateChafonConfig,
  parseChafonConfig,
} from "../../vendors/chafon/parser.ts";
import { detectChafonDevice } from "../../vendors/chafon/detect.ts";
import {
  _clearVendors,
  buildStructuredConfig,
  getVendor,
  registerVendor,
} from "../../lib/registry.ts";
import { chafonPlugin } from "../../vendors/chafon/mod.ts";

const FIXTURES_DIR = new URL("../fixtures/", import.meta.url).pathname;

const loadFixture = async (filename: string): Promise<Uint8Array> =>
  await Deno.readFile(`${FIXTURES_DIR}${filename}`);

const setup = () => {
  _clearVendors();
  registerVendor(chafonPlugin);
};

const INI_FILE = "chafon-uhf-reader-m-series.ini";
const EXPECTED_PARAM_COUNT = 44;

// ── Parsing tests ────────────────────────────────────────────────────

Deno.test("[chafon] parse INI - succeeds", async () => {
  const buf = await loadFixture(INI_FILE);
  const result = await parseChafonConfig(buf);

  assertEquals(result.success, true, "Should parse successfully");
  assertExists(result.config, "Should have config");
});

Deno.test("[chafon] parse INI - correct param count", async () => {
  const buf = await loadFixture(INI_FILE);
  const result = await parseChafonConfig(buf);

  assertEquals(
    Object.keys(result.config!).length,
    EXPECTED_PARAM_COUNT,
    `Should have ${EXPECTED_PARAM_COUNT} params`,
  );
});

Deno.test("[chafon] parse INI - all expected keys present", async () => {
  const buf = await loadFixture(INI_FILE);
  const result = await parseChafonConfig(buf);

  const expectedKeys = [
    // Basic
    "Baud",
    "Power",
    "Addr",
    "Region",
    "StartFreq",
    "EndFreq",
    "IsPointFreq",
    "Workmode",
    "Port",
    "Area",
    "Startaddr",
    "DataLen",
    "Filtertime",
    "Triggletime",
    "Q",
    "Session",
    "WiegandMode",
    "WieggendOutMode",
    "IntenelTime(*100mS)",
    "IsBuzzer",
    // Antenna
    "Ant1",
    "AntPower1",
    "Ant2",
    "AntPower2",
    "Ant3",
    "AntPower3",
    "Ant4",
    "AntPower4",
    // Advanced
    "PasswordEnable",
    "PasswordHEX",
    "MaskEnabled",
    "StartAddr",
    "MaskLen",
    "MaskData",
    "Condition",
    "ConditionIndex",
    "ProtocolEnable",
    "ProrocolType",
    "ProrocolTypeIndex",
    "CacheEnable",
    // Remote
    "IsEnable",
    "RemoteIP",
    "RemotePort",
    "HeartbeatTime",
  ];

  for (const key of expectedKeys) {
    assert(key in result.config!, `Should contain key: ${key}`);
  }
});

// ── Known values ─────────────────────────────────────────────────────

Deno.test("[chafon] parse INI - known values correct", async () => {
  const buf = await loadFixture(INI_FILE);
  const result = await parseChafonConfig(buf);
  const c = result.config!;

  assertEquals(c["Baud"], "9600");
  assertEquals(c["Power"], "33");
  assertEquals(c["Region"], "USA");
  assertEquals(c["Workmode"], "Active Mode");
  assertEquals(c["Q"], "4");
  assertEquals(c["Session"], "S0");
  assertEquals(c["Ant1"], "True");
  assertEquals(c["Ant2"], "False");
  assertEquals(c["PasswordEnable"], "False");
  assertEquals(c["IsEnable"], "True");
  assertEquals(c["RemoteIP"], "192.0.2.1");
  assertEquals(c["RemotePort"], "1801");
});

// ── Device detection ─────────────────────────────────────────────────

Deno.test("[chafon] detectChafonDevice → m_series", async () => {
  const buf = await loadFixture(INI_FILE);
  const result = await parseChafonConfig(buf);
  const deviceId = detectChafonDevice(result.config!);
  assertEquals(deviceId, "m_series");
});

// ── Categorization via registry ──────────────────────────────────────

Deno.test("[chafon] every param gets categorized via buildStructuredConfig", async () => {
  setup();
  const buf = await loadFixture(INI_FILE);
  const result = await parseChafonConfig(buf);
  const vendor = getVendor("chafon")!;
  const structured = buildStructuredConfig(vendor, result.config!);

  let totalInStructured = 0;
  for (const catParams of Object.values(structured)) {
    totalInStructured += Object.keys(catParams).length;
  }

  assertEquals(
    totalInStructured,
    Object.keys(result.config!).length,
    "All params must be categorized",
  );
});

Deno.test("[chafon] structured config has expected categories", async () => {
  setup();
  const buf = await loadFixture(INI_FILE);
  const result = await parseChafonConfig(buf);
  const vendor = getVendor("chafon")!;
  const structured = buildStructuredConfig(vendor, result.config!);

  assertExists(structured.basic, "Should have basic category");
  assertExists(structured.antenna, "Should have antenna category");
  assertExists(structured.advanced, "Should have advanced category");
  assertExists(structured.remote, "Should have remote category");
});

// ── Schema lookup ────────────────────────────────────────────────────

Deno.test("[chafon] every param has a schema via getParamSchema", async () => {
  setup();
  const buf = await loadFixture(INI_FILE);
  const result = await parseChafonConfig(buf);
  const vendor = getVendor("chafon")!;

  for (const paramId of Object.keys(result.config!)) {
    const schema = vendor.getParamSchema("m_series", paramId);
    assertExists(schema, `Param ${paramId} should have a schema`);
    assertExists(schema.name, `Param ${paramId} should have a name`);
    assertExists(schema.category, `Param ${paramId} should have a category`);
  }
});

// ── Round-trip: parse → generate → re-parse ──────────────────────────

Deno.test("[chafon] round-trip preserves all params", async () => {
  const buf = await loadFixture(INI_FILE);
  const result = await parseChafonConfig(buf);

  const generated = await generateChafonConfig(result.config!);
  const reparsed = await parseChafonConfig(generated);

  assertEquals(reparsed.success, true, "Re-parse should succeed");
  assertEquals(
    Object.keys(reparsed.config!).length,
    Object.keys(result.config!).length,
    "Round-trip should preserve param count",
  );

  for (const [key, value] of Object.entries(result.config!)) {
    assertEquals(
      reparsed.config![key],
      value,
      `Param ${key} value should survive round-trip`,
    );
  }
});

// ── Section integrity in generated INI ───────────────────────────────

Deno.test("[chafon] generated INI has correct section headers in order", async () => {
  const buf = await loadFixture(INI_FILE);
  const result = await parseChafonConfig(buf);
  const generated = await generateChafonConfig(result.config!);
  const text = new TextDecoder().decode(generated);

  const sections = [...text.matchAll(/^\[(.+)\]$/gm)].map((m) => m[1]);
  assertEquals(sections, ["Basic", "Antenna", "Advanced", "Remote"]);
});

// ── Reject non-Chafon content ────────────────────────────────────────

Deno.test("[chafon] parseChafonConfig rejects non-INI content", async () => {
  const garbage = new TextEncoder().encode(
    "this is not an INI file\nno sections here\n",
  );
  const result = await parseChafonConfig(garbage);
  assertEquals(result.success, false);
});

Deno.test("[chafon] parseChafonConfig rejects empty file", async () => {
  const empty = new TextEncoder().encode("");
  const result = await parseChafonConfig(empty);
  assertEquals(result.success, false);
});
