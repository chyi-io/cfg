import { assertEquals, assertExists, assert } from "https://deno.land/std@0.216.0/assert/mod.ts";
import { parseCfgFile, generateCfgFile } from "../../vendors/teltonika/parser.ts";
import { detectDeviceFamily } from "../../vendors/teltonika/detect.ts";
import { _clearVendors, registerVendor, getVendor, buildStructuredConfig } from "../../lib/registry.ts";
import { teltonikaPlugin } from "../../vendors/teltonika/mod.ts";

const FIXTURES_DIR = new URL("../fixtures/", import.meta.url).pathname;

const loadFixture = async (filename: string): Promise<Uint8Array> =>
  await Deno.readFile(`${FIXTURES_DIR}${filename}`);

const setup = () => {
  _clearVendors();
  registerVendor(teltonikaPlugin);
};

const EXPECTED_PARAM_COUNTS: Record<string, number> = {
  "1.cfg": 2741,
  "3.cfg": 11493,
};

const EXPECTED_FAMILIES: Record<string, string> = {
  "1.cfg": "fmb",
  "3.cfg": "fmc",
};

// ── Parsing tests ────────────────────────────────────────────────────

for (const file of Object.keys(EXPECTED_PARAM_COUNTS)) {
  Deno.test(`[teltonika] parse ${file} - succeeds and returns correct param count`, async () => {
    const buf = await loadFixture(file);
    const result = await parseCfgFile(buf);

    assertEquals(result.success, true, `${file} should parse successfully`);
    assertExists(result.config, `${file} should have config`);
    assertEquals(
      Object.keys(result.config!).length,
      EXPECTED_PARAM_COUNTS[file],
      `${file} should have ${EXPECTED_PARAM_COUNTS[file]} params`,
    );
  });
}

// ── Device family detection ──────────────────────────────────────────

for (const file of Object.keys(EXPECTED_FAMILIES)) {
  Deno.test(`[teltonika] detectDeviceFamily ${file} → ${EXPECTED_FAMILIES[file]}`, async () => {
    const buf = await loadFixture(file);
    const result = await parseCfgFile(buf);
    const family = detectDeviceFamily(result.config!);
    assertEquals(family, EXPECTED_FAMILIES[file]);
  });
}

// ── Every param gets categorized via registry ────────────────────────

for (const file of Object.keys(EXPECTED_PARAM_COUNTS)) {
  Deno.test(`[teltonika] ${file} - every param gets a valid category`, async () => {
    setup();
    const buf = await loadFixture(file);
    const result = await parseCfgFile(buf);
    const vendor = getVendor("teltonika")!;
    const structured = buildStructuredConfig(vendor, result.config!);

    let totalInStructured = 0;
    for (const catParams of Object.values(structured)) {
      totalInStructured += Object.keys(catParams).length;
    }

    assertEquals(
      totalInStructured,
      Object.keys(result.config!).length,
      `${file}: all params must be categorized`,
    );
  });
}

// ── Every param gets a schema via vendor plugin ──────────────────────

for (const file of Object.keys(EXPECTED_PARAM_COUNTS)) {
  Deno.test(`[teltonika] ${file} - every param has a schema via getParamSchema`, async () => {
    setup();
    const buf = await loadFixture(file);
    const result = await parseCfgFile(buf);
    const vendor = getVendor("teltonika")!;
    const deviceId = vendor.detectDevice(result.config!);

    for (const paramId of Object.keys(result.config!)) {
      const schema = vendor.getParamSchema(deviceId, paramId);
      assertExists(schema, `Param ${paramId} should have a schema`);
      assertExists(schema.name, `Param ${paramId} should have a name`);
      assertExists(schema.category, `Param ${paramId} should have a category`);
    }
  });
}

// ── Key params present in all files ──────────────────────────────────

const COMMON_KEY_PARAMS = [
  "101", "102", "103", "104", "105", "106", "107", "108", "109", "110",
  "1000", "1001", "1002", "1003",
  "2000", "2001", "2004", "2005", "2006",
  "3000", "3005",
];

for (const file of Object.keys(EXPECTED_PARAM_COUNTS)) {
  Deno.test(`[teltonika] ${file} - contains all common key params`, async () => {
    const buf = await loadFixture(file);
    const result = await parseCfgFile(buf);

    for (const pid of COMMON_KEY_PARAMS) {
      assert(pid in result.config!, `${file} should contain param ${pid}`);
    }
  });
}

// ── FMC-specific params in large files ───────────────────────────────

Deno.test("[teltonika] 3.cfg (FMC) has CAN adapter params (30000+)", async () => {
  setup();
  const buf = await loadFixture("3.cfg");
  const result = await parseCfgFile(buf);
  const vendor = getVendor("teltonika")!;
  const structured = buildStructuredConfig(vendor, result.config!);

  assertExists(structured.can_adapter, "FMC should have can_adapter category");
  assert(
    Object.keys(structured.can_adapter).length > 100,
    "FMC should have many CAN adapter params",
  );
});

Deno.test("[teltonika] 3.cfg (FMC) has OBD PID params (50000+)", async () => {
  setup();
  const buf = await loadFixture("3.cfg");
  const result = await parseCfgFile(buf);
  const vendor = getVendor("teltonika")!;
  const structured = buildStructuredConfig(vendor, result.config!);

  assertExists(structured.obd_pids, "FMC should have obd_pids category");
  assert(
    Object.keys(structured.obd_pids).length > 500,
    "FMC should have many OBD PID params",
  );
});

Deno.test("[teltonika] 1.cfg (FMB) has fewer CAN adapter params than 3.cfg (FMC)", async () => {
  setup();
  const buf1 = await loadFixture("1.cfg");
  const buf3 = await loadFixture("3.cfg");
  const r1 = await parseCfgFile(buf1);
  const r3 = await parseCfgFile(buf3);
  const vendor = getVendor("teltonika")!;
  const s1 = buildStructuredConfig(vendor, r1.config!);
  const s3 = buildStructuredConfig(vendor, r3.config!);

  const fmbCan = Object.keys(s1.can_adapter || {}).length;
  const fmcCan = Object.keys(s3.can_adapter || {}).length;
  assert(fmcCan > fmbCan, `FMC CAN (${fmcCan}) should exceed FMB CAN (${fmbCan})`);
});

// ── Round-trip: parse → generate → re-parse ──────────────────────────

for (const file of Object.keys(EXPECTED_PARAM_COUNTS)) {
  Deno.test(`[teltonika] ${file} - round-trip preserves all params`, async () => {
    const buf = await loadFixture(file);
    const result = await parseCfgFile(buf);

    const generated = await generateCfgFile(result.config!);
    const reparsed = await parseCfgFile(generated);

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
}

// ── Specific known values from sanitized fixtures ────────────────────

Deno.test("[teltonika] 1.cfg has expected sanitized server config", async () => {
  const buf = await loadFixture("1.cfg");
  const result = await parseCfgFile(buf);

  assertEquals(result.config!["2001"], "internet", "APN should be internet");
  assertEquals(result.config!["2004"], "example.test", "Server domain");
  assertEquals(result.config!["2005"], "5027", "Server port");
  assertEquals(result.config!["2006"], "0", "Protocol TCP");
});

Deno.test("[teltonika] 3.cfg (FMC) has device name containing FMC", async () => {
  const buf = await loadFixture("3.cfg");
  const result = await parseCfgFile(buf);

  assert(
    result.config!["801"]?.includes("FMC"),
    `Device name "${result.config!["801"]}" should contain FMC`,
  );
});
