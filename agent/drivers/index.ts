// Built-in driver registry. Add a line here to ship a new driver with the
// agent. See docs/drivers.md for the steps to author one.

import { register } from "./registry.ts";
import { chafonM200Driver } from "./chafon-m200/index.ts";

let initialized = false;

export function initBuiltinDrivers(): void {
  if (initialized) return;
  initialized = true;
  register(chafonM200Driver);
}
