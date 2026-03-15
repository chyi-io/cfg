import { assertEquals } from "https://deno.land/std@0.216.0/assert/mod.ts";
import { categorizeParam } from "../../vendors/teltonika/categories.ts";

// ── Category range mapping tests ─────────────────────────────────────

const RANGE_TESTS: [number, string][] = [
  [1, "system"],
  [10, "system"],
  [101, "io_elements"],
  [150, "io_elements"],
  [199, "io_elements"],
  [200, "io_elements"],
  [800, "io_elements"],
  [999, "io_elements"],
  [1000, "data_acquisition"],
  [1050, "data_acquisition"],
  [1099, "data_acquisition"],
  [1100, "data_acquisition"],
  [1200, "data_acquisition"],
  [1399, "data_acquisition"],
  [1400, "features"],
  [1599, "features"],
  [1600, "sms_data_sending"],
  [1649, "sms_data_sending"],
  [1699, "sms_data_sending"],
  [1700, "obd_can"],
  [1999, "obd_can"],
  [2000, "gprs_server"],
  [2004, "gprs_server"],
  [2099, "gprs_server"],
  [2100, "network"],
  [2999, "network"],
  [3000, "device_behavior"],
  [3004, "device_behavior"],
  [3099, "device_behavior"],
  [3100, "device_behavior"],
  [3999, "device_behavior"],
  [4000, "authorized_numbers"],
  [4099, "authorized_numbers"],
  [4100, "bluetooth"],
  [4199, "bluetooth"],
  [4200, "features"],
  [4999, "features"],
  [5000, "io_settings"],
  [5500, "io_settings"],
  [5999, "io_settings"],
  [6000, "trip_odometer"],
  [6009, "trip_odometer"],
  [6999, "trip_odometer"],
  [7000, "advanced"],
  [9999, "advanced"],
  [10000, "scenario_io"],
  [19999, "scenario_io"],
  [20000, "accelerometer"],
  [29999, "accelerometer"],
  [30000, "can_adapter"],
  [49999, "can_adapter"],
  [50000, "obd_pids"],
  [60000, "obd_pids"],
];

for (const [paramId, expected] of RANGE_TESTS) {
  Deno.test(`[teltonika] categorizeParam(${paramId}) → "${expected}"`, () => {
    assertEquals(categorizeParam(paramId), expected);
  });
}

// ── Edge cases ───────────────────────────────────────────────────────

Deno.test("[teltonika] categorizeParam gap range (11-100) → other", () => {
  assertEquals(categorizeParam(50), "other");
  assertEquals(categorizeParam(100), "other");
});

Deno.test("[teltonika] categorizeParam boundary transitions are correct", () => {
  // 1099 → data_acquisition, 1100 → data_acquisition (same)
  assertEquals(categorizeParam(1099), "data_acquisition");
  assertEquals(categorizeParam(1100), "data_acquisition");
  // 1399 → data_acquisition, 1400 → features
  assertEquals(categorizeParam(1399), "data_acquisition");
  assertEquals(categorizeParam(1400), "features");
  // 1699 → sms_data_sending, 1700 → obd_can
  assertEquals(categorizeParam(1699), "sms_data_sending");
  assertEquals(categorizeParam(1700), "obd_can");
  // 2099 → gprs_server, 2100 → network
  assertEquals(categorizeParam(2099), "gprs_server");
  assertEquals(categorizeParam(2100), "network");
});
