import type { DeviceDefinition } from "../../../lib/types.ts";
import { ruptelaCategories } from "../categories.ts";
import { eco5ParamSchemas } from "../schemas.ts";

/**
 * Ruptela ECO5 device definition.
 * Compact LTE GPS tracker with BLE 5.0, digital/analog I/O.
 */
export const eco5Device: DeviceDefinition = {
  id: "eco5",
  name: "Ruptela ECO5",
  vendorId: "ruptela",
  categories: ruptelaCategories,
  paramSchemas: eco5ParamSchemas,
  defaults: {
    "100": "internet",
    "110": "",
    "111": "9988",
    "112": "0",
    "200": "300",
    "201": "30",
    "210": "100",
    "211": "10",
    "212": "5",
    "213": "2",
    "220": "1",
    "10": "0",
    "12": "1",
    "13": "0",
    "20": "000000",
  },
};
