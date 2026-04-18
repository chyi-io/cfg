// Dispatcher: receives `req` envelopes from the cloud relay and routes them.
//
// Global commands (drivers.list, connection.open/close/status) are handled
// inline here. Every other command is driver-scoped: connection.open picks
// a Driver from the registry, stashes the resulting Device, and subsequent
// commands are routed through that Driver's `handlers` map. If a driver
// doesn't implement a command the cloud sees STAT_NOT_CAPABLE (HTTP 501).
//
// A BUSY cap (default 16 in-flight) prevents an unbounded queue. Per-device
// mutual exclusion is the driver's responsibility (e.g. Reader.AsyncMutex).

import type {
  CommandName,
  CommandPayloads,
  CommandResponses,
} from "../shared/protocol.ts";
import {
  BUSY,
  type ErrorBody,
  NOT_OPEN,
  toErrorBody,
} from "../shared/errors.ts";
import { assertIPv4, assertString, assertU16 } from "../shared/validate.ts";
import { log } from "./log.ts";
import type {
  Device,
  Driver,
  DriverCommand,
  DriverHandler,
} from "./drivers/types.ts";
import {
  get as getDriver,
  listInfo as listDrivers,
} from "./drivers/registry.ts";

interface ActiveSession {
  driver: Driver;
  device: Device;
  openedAt: number;
}

class ReaderSession {
  private active: ActiveSession | null = null;

  get current(): ActiveSession | null {
    return this.active;
  }

  requireOpen(): ActiveSession {
    if (!this.active || this.active.device.isClosed()) {
      const err = new Error(NOT_OPEN.message);
      (err as Error & { __errorBody?: ErrorBody }).__errorBody = NOT_OPEN;
      throw err;
    }
    return this.active;
  }

  async open(
    driver: Driver,
    ip: string,
    port: number,
    timeoutMs: number,
  ): Promise<ActiveSession> {
    if (this.active && !this.active.device.isClosed()) {
      await this.active.device.close().catch(() => {});
    }
    const device = await driver.open({ ip, port, timeoutMs });
    this.active = { driver, device, openedAt: Date.now() };
    return this.active;
  }

  async close(): Promise<void> {
    if (this.active && !this.active.device.isClosed()) {
      await this.active.device.close();
    }
    this.active = null;
  }
}

export class Dispatcher {
  readonly session = new ReaderSession();
  private inflight = 0;

  constructor(private maxQueue: number) {}

  async dispatch(cmd: CommandName, payload: unknown, traceId: string): Promise<
    { ok: true; data: unknown } | { ok: false; error: ErrorBody }
  > {
    if (this.inflight >= this.maxQueue) {
      return { ok: false, error: BUSY };
    }
    this.inflight++;
    const start = performance.now();
    try {
      const data = await this.route(cmd, payload);
      log.info("cmd", {
        traceId,
        cmd,
        ok: true,
        ms: Math.round(performance.now() - start),
      });
      return { ok: true, data };
    } catch (err) {
      const body = (err as { __errorBody?: ErrorBody }).__errorBody ??
        toErrorBody(err, traceId);
      log.warn("cmd", {
        traceId,
        cmd,
        ok: false,
        code: body.statusName,
        message: body.message,
        ms: Math.round(performance.now() - start),
      });
      return { ok: false, error: { ...body, traceId } };
    } finally {
      this.inflight--;
    }
  }

  private async route(cmd: CommandName, payload: unknown): Promise<unknown> {
    switch (cmd) {
      case "drivers.list":
        return { drivers: listDrivers() };
      case "connection.open":
        return await this.openConn(payload);
      case "connection.close":
        await this.session.close();
        return {};
      case "connection.status": {
        const a = this.session.current;
        if (!a || a.device.isClosed()) return { open: false };
        let info: unknown;
        const handler = a.driver.handlers["connection.info"];
        if (handler) {
          try {
            info = await handler(
              a.device,
              {} as CommandPayloads["connection.info"],
            );
          } catch {
            // Status mustn't fail the whole status query.
          }
        }
        return {
          open: true,
          driver: a.driver.id,
          capabilities: a.driver.capabilities,
          info,
        };
      }
      default:
        return await this.routeDriver(cmd as DriverCommand, payload);
    }
  }

  private async openConn(
    payload: unknown,
  ): Promise<CommandResponses["connection.open"]> {
    const p = payload as CommandPayloads["connection.open"];
    const driverId = assertString(p?.driver, "driver");
    const driver = getDriver(driverId);
    if (!driver) {
      const known = listDrivers().map((d) => d.id).join(", ") || "(none)";
      throw new Error(`Unknown driver "${driverId}" (known: ${known})`);
    }
    const ip = assertIPv4(p.ip, "ip");
    const port = assertU16(p.port, "port");
    const timeoutMs = typeof p.timeoutMs === "number" ? p.timeoutMs : 3000;
    const session = await this.session.open(driver, ip, port, timeoutMs);
    let deviceInfo: unknown = {};
    const infoHandler = driver.handlers["connection.info"];
    if (infoHandler) {
      deviceInfo = await infoHandler(
        session.device,
        {} as CommandPayloads["connection.info"],
      );
    }
    return {
      driver: driver.id,
      capabilities: driver.capabilities,
      deviceInfo,
    };
  }

  private async routeDriver(
    cmd: DriverCommand,
    payload: unknown,
  ): Promise<unknown> {
    const session = this.session.requireOpen();
    const handler = session.driver.handlers[cmd] as
      | DriverHandler<DriverCommand>
      | undefined;
    if (!handler) {
      const err = new Error(
        `Driver "${session.driver.id}" does not support command "${cmd}"`,
      );
      (err as Error & { __errorBody?: ErrorBody }).__errorBody = {
        code: 0xfffffe08,
        statusName: "STAT_NOT_CAPABLE",
        httpStatus: 501,
        message: err.message,
      };
      throw err;
    }
    return await handler(
      session.device,
      payload as CommandPayloads[DriverCommand],
    );
  }

  async shutdown(): Promise<void> {
    await this.session.close().catch(() => {});
  }
}
