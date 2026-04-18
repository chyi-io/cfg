// Capabilities are per-driver feature flags. The cloud UI uses them to decide
// which feature tabs to render after a connection is opened. New capabilities
// are added here and then claimed by individual drivers.

export type Capability =
  | "device_info"
  | "work_mode"
  | "remote_server"
  | "whitelist";

export const ALL_CAPABILITIES: Capability[] = [
  "device_info",
  "work_mode",
  "remote_server",
  "whitelist",
];

export const CAPABILITY_LABELS: Record<Capability, string> = {
  device_info: "Device info",
  work_mode: "Work mode",
  remote_server: "Remote server",
  whitelist: "Whitelist",
};

export interface DriverInfo {
  id: string;
  name: string;
  description: string;
  capabilities: Capability[];
}
