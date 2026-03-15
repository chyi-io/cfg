import type { CategoryDef } from "../../lib/types.ts";

/**
 * All Teltonika parameter categories, ordered for sidebar display.
 */
export const teltonikaCategories: readonly CategoryDef[] = [
  { id: "system", label: "System", icon: "\u{1F4BB}", color: "bg-slate-100 text-slate-700", order: 0 },
  { id: "gprs_server", label: "GPRS / Server", icon: "\u{1F310}", color: "bg-blue-100 text-blue-700", order: 1 },
  { id: "network", label: "Network", icon: "\u{1F4F6}", color: "bg-sky-100 text-sky-700", order: 2 },
  { id: "data_acquisition", label: "Data Acquisition", icon: "\u{1F4E1}", color: "bg-amber-100 text-amber-700", order: 3 },
  { id: "io_elements", label: "I/O Elements", icon: "\u{1F50C}", color: "bg-teal-100 text-teal-700", order: 4 },
  { id: "io_settings", label: "I/O Settings", icon: "\u{2699}\u{FE0F}", color: "bg-cyan-100 text-cyan-700", order: 5 },
  { id: "scenario_io", label: "Scenario / IO Config", icon: "\u{1F4CB}", color: "bg-indigo-100 text-indigo-700", order: 6 },
  { id: "device_behavior", label: "Device Behavior", icon: "\u{1F527}", color: "bg-purple-100 text-purple-700", order: 7 },
  { id: "sms_data_sending", label: "SMS / Data Sending", icon: "\u{1F4E8}", color: "bg-green-100 text-green-700", order: 8 },
  { id: "features", label: "Features", icon: "\u{2B50}", color: "bg-yellow-100 text-yellow-700", order: 9 },
  { id: "obd_can", label: "OBD / CAN Bus", icon: "\u{1F697}", color: "bg-orange-100 text-orange-700", order: 10 },
  { id: "bluetooth", label: "Bluetooth", icon: "\u{1F4F1}", color: "bg-violet-100 text-violet-700", order: 11 },
  { id: "authorized_numbers", label: "Authorized Numbers", icon: "\u{1F4DE}", color: "bg-rose-100 text-rose-700", order: 12 },
  { id: "trip_odometer", label: "Trip / Odometer", icon: "\u{1F4CF}", color: "bg-lime-100 text-lime-700", order: 13 },
  { id: "accelerometer", label: "Accelerometer", icon: "\u{1F4C8}", color: "bg-emerald-100 text-emerald-700", order: 14 },
  { id: "can_adapter", label: "CAN Adapter", icon: "\u{1F6E0}\u{FE0F}", color: "bg-red-100 text-red-700", order: 15, deviceOnly: "fmc" },
  { id: "obd_pids", label: "OBD PIDs", icon: "\u{1F50D}", color: "bg-fuchsia-100 text-fuchsia-700", order: 16, deviceOnly: "fmc" },
  { id: "advanced", label: "Advanced", icon: "\u{1F9EA}", color: "bg-gray-100 text-gray-700", order: 17 },
  { id: "other", label: "Other", icon: "\u{1F4C1}", color: "bg-stone-100 text-stone-700", order: 18 },
];

/**
 * FMB categories (exclude FMC-only categories).
 */
export const fmbCategories: readonly CategoryDef[] = teltonikaCategories.filter(
  (c) => !c.deviceOnly || c.deviceOnly === "fmb",
);

/**
 * FMC categories (all categories).
 */
export const fmcCategories: readonly CategoryDef[] = teltonikaCategories;

/**
 * Assign a category key to a numeric parameter ID based on Teltonika ID ranges.
 *
 * @param paramId - Numeric parameter ID.
 * @returns Category key string.
 */
export const categorizeParam = (paramId: number): string => {
  if (paramId <= 10) return "system";
  if (paramId >= 101 && paramId <= 199) return "io_elements";
  if (paramId >= 200 && paramId <= 999) return "io_elements";
  if (paramId >= 1000 && paramId <= 1099) return "data_acquisition";
  if (paramId >= 1100 && paramId <= 1399) return "data_acquisition";
  if (paramId >= 1400 && paramId <= 1599) return "features";
  if (paramId >= 1600 && paramId <= 1699) return "sms_data_sending";
  if (paramId >= 1700 && paramId <= 1999) return "obd_can";
  if (paramId >= 2000 && paramId <= 2099) return "gprs_server";
  if (paramId >= 2100 && paramId <= 2999) return "network";
  if (paramId >= 3000 && paramId <= 3099) return "device_behavior";
  if (paramId >= 3100 && paramId <= 3999) return "device_behavior";
  if (paramId >= 4000 && paramId <= 4099) return "authorized_numbers";
  if (paramId >= 4100 && paramId <= 4199) return "bluetooth";
  if (paramId >= 4200 && paramId <= 4999) return "features";
  if (paramId >= 5000 && paramId <= 5999) return "io_settings";
  if (paramId >= 6000 && paramId <= 6999) return "trip_odometer";
  if (paramId >= 7000 && paramId <= 9999) return "advanced";
  if (paramId >= 10000 && paramId <= 19999) return "scenario_io";
  if (paramId >= 20000 && paramId <= 29999) return "accelerometer";
  if (paramId >= 30000 && paramId <= 49999) return "can_adapter";
  if (paramId >= 50000) return "obd_pids";
  return "other";
};
