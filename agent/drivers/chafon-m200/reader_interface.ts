import type { DeviceFullInfo, DevicePara, RemoteNetInfo } from "../../../shared/types.ts";

export interface ReaderLike {
  readonly id: string;
  isClosed(): boolean;
  close(): Promise<void>;
  getDeviceInfo(): Promise<DeviceFullInfo>;
  getDevicePara(): Promise<DevicePara>;
  setDevicePara(p: DevicePara): Promise<void>;
  getRemoteNetInfo(): Promise<RemoteNetInfo>;
  setRemoteNetInfo(info: RemoteNetInfo): Promise<void>;
  getWorkMode(): Promise<number>;
  setWorkMode(workMode: number): Promise<void>;
  getWhitelist(timeoutMs?: number): Promise<Uint8Array[]>;
  setWhitelist(cards: Uint8Array[]): Promise<{ uploaded: number }>;
}

export interface ReaderOpener {
  openTcp(ip: string, port: number, timeoutMs: number): Promise<ReaderLike>;
}
