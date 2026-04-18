// In-memory fake reader for dev/tests. Same public shape as Reader so the
// dispatcher can use either transparently.

import type { DeviceFullInfo, DevicePara, RemoteNetInfo } from "../../../shared/types.ts";
import type { ReaderLike } from "./reader_interface.ts";
import { ReaderError } from "../../../shared/errors.ts";

const DEFAULT_PARA: DevicePara = {
  addr: 0xff,
  protocol: 0,
  workMode: 0,
  iface: 0x20,
  baudRate: 5,
  wgSet: 0,
  ant: 0x01,
  region: 1,
  startFreqI: 920,
  startFreqD: 125,
  stepFreq: 250,
  channel: 0,
  rfPower: 25,
  inventoryArea: 0,
  q: 4,
  session: 0,
  acsAddr: 0,
  acsDataLen: 6,
  filterTime: 10,
  triggerTime: 0,
  buzzerTime: 1,
  internalTime: 10,
};

const DEFAULT_INFO: DeviceFullInfo = {
  deviceHardVersion: "MOCK-HW-1.0",
  deviceFirmVersion: "MOCK-FW-1.0",
  deviceSN: "DEADBEEF000000000000DEAD",
  hardVersion: "MOCK-HW-1.0",
  firmVersion: "MOCK-FW-1.0",
  sn: "DEADBEEF000000000000DEAD",
};

export class MockReader implements ReaderLike {
  readonly id = crypto.randomUUID();
  private closed = false;
  private para: DevicePara = { ...DEFAULT_PARA };
  private info: DeviceFullInfo = { ...DEFAULT_INFO };
  private remote: RemoteNetInfo = { enabled: false, ip: "0.0.0.0", port: 0, heartTime: 10 };
  private whitelist: Uint8Array[] = [];

  static openTcp(ip: string, _port: number, _timeoutMs: number): MockReader {
    const r = new MockReader();
    r.info = { ...DEFAULT_INFO, deviceFirmVersion: `MOCK-${ip}` };
    return r;
  }

  isClosed(): boolean {
    return this.closed;
  }

  close(): Promise<void> {
    this.closed = true;
    return Promise.resolve();
  }

  private check(): void {
    if (this.closed) throw new ReaderError(0xffffff17, `Reader ${this.id} is closed`);
  }

  getDeviceInfo(): Promise<DeviceFullInfo> {
    this.check();
    return Promise.resolve({ ...this.info });
  }

  getDevicePara(): Promise<DevicePara> {
    this.check();
    return Promise.resolve({ ...this.para });
  }

  setDevicePara(p: DevicePara): Promise<void> {
    this.check();
    this.para = { ...p };
    return Promise.resolve();
  }

  getRemoteNetInfo(): Promise<RemoteNetInfo> {
    this.check();
    return Promise.resolve({ ...this.remote });
  }

  setRemoteNetInfo(info: RemoteNetInfo): Promise<void> {
    this.check();
    this.remote = { ...info };
    return Promise.resolve();
  }

  async getWorkMode(): Promise<number> {
    return (await this.getDevicePara()).workMode;
  }

  async setWorkMode(workMode: number): Promise<void> {
    const p = await this.getDevicePara();
    await this.setDevicePara({ ...p, workMode });
  }

  getWhitelist(_timeoutMs = 2000): Promise<Uint8Array[]> {
    this.check();
    return Promise.resolve(this.whitelist.map((c) => c.slice()));
  }

  setWhitelist(cards: Uint8Array[]): Promise<{ uploaded: number }> {
    this.check();
    this.whitelist = cards.map((c) => c.slice());
    return Promise.resolve({ uploaded: cards.length });
  }
}
