// Pack/unpack helpers for the SDK structs.
// Layouts verified against the vendor's CFApi.h header and cross-checked with
// the C# WhiteListParam.cs / DeviceParam.cs which use explicit ByValArray
// markers to enforce a packed layout.

import type {
  DeviceFullInfo,
  DevicePara,
  RemoteNetInfo,
} from "../../../shared/types.ts";
export type { DeviceFullInfo, DevicePara, RemoteNetInfo };

// ─────────── DevicePara ───────────────────────────────────────────────────────
export const DEVICE_PARA_SIZE = 25;

export function unpackDevicePara(buf: Uint8Array): DevicePara {
  if (buf.byteLength < DEVICE_PARA_SIZE) {
    throw new Error(
      `DevicePara buffer too small: ${buf.byteLength} < ${DEVICE_PARA_SIZE}`,
    );
  }
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return {
    addr: dv.getUint8(0),
    protocol: dv.getUint8(1),
    workMode: dv.getUint8(2),
    iface: dv.getUint8(3),
    baudRate: dv.getUint8(4),
    wgSet: dv.getUint8(5),
    ant: dv.getUint8(6),
    region: dv.getUint8(7),
    startFreqI: dv.getUint16(8, false),
    startFreqD: dv.getUint16(10, false),
    stepFreq: dv.getUint16(12, false),
    channel: dv.getUint8(14),
    rfPower: dv.getUint8(15),
    inventoryArea: dv.getUint8(16),
    q: dv.getUint8(17),
    session: dv.getUint8(18),
    acsAddr: dv.getUint8(19),
    acsDataLen: dv.getUint8(20),
    filterTime: dv.getUint8(21),
    triggerTime: dv.getUint8(22),
    buzzerTime: dv.getUint8(23),
    internalTime: dv.getUint8(24),
  };
}

export function packDeviceParaArgs(p: DevicePara): number[] {
  const fI_hi = (p.startFreqI >>> 8) & 0xff;
  const fI_lo = p.startFreqI & 0xff;
  const fD_hi = (p.startFreqD >>> 8) & 0xff;
  const fD_lo = p.startFreqD & 0xff;
  const sF_hi = (p.stepFreq >>> 8) & 0xff;
  const sF_lo = p.stepFreq & 0xff;
  return [
    p.addr & 0xff,
    p.protocol & 0xff,
    p.workMode & 0xff,
    p.iface & 0xff,
    p.baudRate & 0xff,
    p.wgSet & 0xff,
    p.ant & 0xff,
    p.region & 0xff,
    fI_hi,
    fI_lo,
    fD_hi,
    fD_lo,
    sF_hi,
    sF_lo,
    p.channel & 0xff,
    p.rfPower & 0xff,
    p.inventoryArea & 0xff,
    p.q & 0xff,
    p.session & 0xff,
    p.acsAddr & 0xff,
    p.acsDataLen & 0xff,
    p.filterTime & 0xff,
    p.triggerTime & 0xff,
    p.buzzerTime & 0xff,
    p.internalTime & 0xff,
  ];
}

// ─────────── RemoteNetInfo ────────────────────────────────────────────────────
export const REMOTE_NET_INFO_SIZE = 8;

export function unpackRemoteNetInfo(buf: Uint8Array): RemoteNetInfo {
  if (buf.byteLength < REMOTE_NET_INFO_SIZE) {
    throw new Error(
      `RemoteNetInfo buffer too small: ${buf.byteLength} < ${REMOTE_NET_INFO_SIZE}`,
    );
  }
  return {
    enabled: buf[0] !== 0,
    ip: `${buf[1]}.${buf[2]}.${buf[3]}.${buf[4]}`,
    port: (buf[5] << 8) | buf[6],
    heartTime: buf[7],
  };
}

export function packRemoteNetInfo(
  info: RemoteNetInfo,
): Uint8Array<ArrayBuffer> {
  const ipParts = info.ip.split(".").map((s) => Number.parseInt(s, 10));
  if (
    ipParts.length !== 4 ||
    ipParts.some((n) => Number.isNaN(n) || n < 0 || n > 255)
  ) {
    throw new Error(`Invalid IPv4 address: ${info.ip}`);
  }
  if (info.port < 0 || info.port > 65535) {
    throw new Error(`Invalid port: ${info.port}`);
  }
  const buf = new Uint8Array(REMOTE_NET_INFO_SIZE);
  buf[0] = info.enabled ? 1 : 0;
  buf[1] = ipParts[0];
  buf[2] = ipParts[1];
  buf[3] = ipParts[2];
  buf[4] = ipParts[3];
  buf[5] = (info.port >>> 8) & 0xff;
  buf[6] = info.port & 0xff;
  buf[7] = info.heartTime & 0xff;
  return buf;
}

// ─────────── DeviceFullInfo ───────────────────────────────────────────────────
export const DEVICE_FULL_INFO_SIZE = 152;

function asciiCStr(buf: Uint8Array, offset: number, maxLen: number): string {
  let end = offset;
  const max = Math.min(offset + maxLen, buf.byteLength);
  while (end < max && buf[end] !== 0) end++;
  let realEnd = end;
  while (realEnd > offset && buf[realEnd - 1] < 0x20) realEnd--;
  return new TextDecoder("utf-8", { fatal: false }).decode(
    buf.subarray(offset, realEnd),
  );
}

function hexField(buf: Uint8Array, offset: number, len: number): string {
  let s = "";
  const end = Math.min(offset + len, buf.byteLength);
  for (let i = offset; i < end; i++) {
    s += buf[i].toString(16).padStart(2, "0");
  }
  return s.toUpperCase();
}

export function unpackDeviceFullInfo(buf: Uint8Array): DeviceFullInfo {
  if (buf.byteLength < DEVICE_FULL_INFO_SIZE) {
    throw new Error(
      `DeviceFullInfo buffer too small: ${buf.byteLength} < ${DEVICE_FULL_INFO_SIZE}`,
    );
  }
  return {
    deviceHardVersion: asciiCStr(buf, 0, 32),
    deviceFirmVersion: asciiCStr(buf, 32, 32),
    deviceSN: hexField(buf, 64, 12),
    hardVersion: asciiCStr(buf, 76, 32),
    firmVersion: asciiCStr(buf, 108, 32),
    sn: hexField(buf, 140, 12),
  };
}

// ─────────── WhiteList chunk ──────────────────────────────────────────────────
export const WHITELIST_BUFFER_SIZE = 4100;

export interface WhiteListChunk {
  status: number;
  frameNum: number;
  infoCount: number;
  payload: Uint8Array;
}

export function unpackWhiteListChunk(buf: Uint8Array): WhiteListChunk {
  if (buf.byteLength < WHITELIST_BUFFER_SIZE) {
    throw new Error(
      `WhiteList buffer too small: ${buf.byteLength} < ${WHITELIST_BUFFER_SIZE}`,
    );
  }
  return {
    status: buf[0],
    frameNum: (buf[1] << 8) | buf[2],
    infoCount: buf[3],
    payload: buf.subarray(4, 4 + 4096),
  };
}

// Whitelist payload card slot encoding
export const MAX_CARDS_PER_PACKET = 64;
export const CARD_SLOT_SIZE = 32;

export function buildSetWhitelistPacket(
  packetIndex1: number,
  cards: Uint8Array[],
): Uint8Array<ArrayBuffer> {
  if (cards.length === 0 || cards.length > MAX_CARDS_PER_PACKET) {
    throw new Error(`Invalid cards length: ${cards.length}`);
  }
  if (packetIndex1 < 1 || packetIndex1 > 65535) {
    throw new Error(`Invalid packet index: ${packetIndex1}`);
  }
  const buf = new Uint8Array(3 + cards.length * CARD_SLOT_SIZE);
  buf[0] = (packetIndex1 >>> 8) & 0xff;
  buf[1] = packetIndex1 & 0xff;
  buf[2] = cards.length;
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    if (card.length > CARD_SLOT_SIZE - 1) {
      throw new Error(
        `Card ${i} too long: ${card.length} > ${CARD_SLOT_SIZE - 1}`,
      );
    }
    const slotOffset = 3 + i * CARD_SLOT_SIZE;
    buf[slotOffset] = card.length;
    buf.set(card, slotOffset + 1);
  }
  return buf;
}

export function decodeCardSlots(
  payload: Uint8Array,
  infoCount: number,
): Uint8Array[] {
  const cards: Uint8Array[] = [];
  for (let i = 0; i < infoCount; i++) {
    const slotOffset = i * CARD_SLOT_SIZE;
    if (slotOffset + CARD_SLOT_SIZE > payload.byteLength) break;
    const len = payload[slotOffset];
    if (len === 0 || len > CARD_SLOT_SIZE - 1) continue;
    cards.push(payload.slice(slotOffset + 1, slotOffset + 1 + len));
  }
  return cards;
}
