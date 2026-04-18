export interface DevicePara {
  addr: number;
  protocol: number;
  workMode: number;
  iface: number;
  baudRate: number;
  wgSet: number;
  ant: number;
  region: number;
  startFreqI: number;
  startFreqD: number;
  stepFreq: number;
  channel: number;
  rfPower: number;
  inventoryArea: number;
  q: number;
  session: number;
  acsAddr: number;
  acsDataLen: number;
  filterTime: number;
  triggerTime: number;
  buzzerTime: number;
  internalTime: number;
}

export interface RemoteNetInfo {
  enabled: boolean;
  ip: string;
  port: number;
  heartTime: number;
}

export interface DeviceFullInfo {
  deviceHardVersion: string;
  deviceFirmVersion: string;
  deviceSN: string;
  hardVersion: string;
  firmVersion: string;
  sn: string;
}

export type WorkMode = 0 | 1 | 2;
export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  0: "Response (host queries reader)",
  1: "Active (reader auto-pushes events)",
  2: "Trigger (GPIO-driven)",
};
