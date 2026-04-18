// Driver abstraction. Each device family (Chafon M200, future weighing
// scales, future barcode readers, ...) ships as a Driver that knows how to
// open a connection and exposes typed handlers for the commands it supports.
// The dispatcher routes per-driver — if a driver doesn't implement a command,
// the cloud surfaces a clear "not supported by this device" error.

import type { Capability } from "../../shared/capabilities.ts";
import type { CommandName, CommandPayloads, CommandResponses } from "../../shared/protocol.ts";

export interface OpenParams {
  ip: string;
  port: number;
  timeoutMs?: number;
}

/** Opaque handle to an open device. Driver-specific implementations carry
 * their own state; the dispatcher only treats them as opaque. */
export interface Device {
  readonly id: string;
  isClosed(): boolean;
  close(): Promise<void>;
}

/** Driver-scoped commands. `connection.open`/`close`/`status` and
 * `drivers.list` are handled by the dispatcher itself, not by drivers. */
export type DriverCommand = Exclude<
  CommandName,
  "drivers.list" | "connection.open" | "connection.close" | "connection.status"
>;

export type DriverHandler<K extends DriverCommand> = (
  device: Device,
  payload: CommandPayloads[K],
) => Promise<CommandResponses[K]>;

export type DriverHandlers = {
  [K in DriverCommand]?: DriverHandler<K>;
};

export interface Driver {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly capabilities: Capability[];
  /**
   * Native shared libraries the driver needs at runtime (file names only).
   * They live under `agent/drivers/<id>/native/<file>` in the source tree
   * and are bundled into the compiled agent binary via `deno compile
   * --include drivers`. At startup the agent extracts them to
   * `<cache>/<driver-id>/<file>` and adjusts LD_LIBRARY_PATH so the dynamic
   * loader can resolve dependent .so files without per-host setup.
   */
  readonly nativeLibs?: string[];
  open(params: OpenParams): Promise<Device>;
  handlers: DriverHandlers;
}
