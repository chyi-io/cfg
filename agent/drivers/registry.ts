import type { Driver } from "./types.ts";
import type { DriverInfo } from "../../shared/capabilities.ts";

const drivers = new Map<string, Driver>();

export function register(driver: Driver): void {
  if (drivers.has(driver.id)) {
    throw new Error(`Driver "${driver.id}" already registered`);
  }
  drivers.set(driver.id, driver);
}

export function get(id: string): Driver | undefined {
  return drivers.get(id);
}

export function list(): Driver[] {
  return [...drivers.values()];
}

export function listInfo(): DriverInfo[] {
  return list().map((d) => ({
    id: d.id,
    name: d.name,
    description: d.description,
    capabilities: d.capabilities,
  }));
}

export function clear(): void {
  drivers.clear();
}
