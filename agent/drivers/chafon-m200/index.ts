// Chafon M200 RFID reader driver.
//
// FFI to the vendor's libCFApi.so. The Reader class lives in reader.ts and
// implements ReaderLike; this file wraps it as a Driver for the agent's
// driver registry.

import type { Device, Driver, DriverHandlers, OpenParams } from "../types.ts";
import type { ReaderLike } from "./reader_interface.ts";
import { Reader } from "./reader.ts";
import { MockReader } from "./mock_reader.ts";
import { assertByte, assertIPv4, assertU16, bytesToHex, hexToBytes } from "../../../shared/validate.ts";

function shouldUseMock(): boolean {
  return Deno.env.get("CHYI_CFG_FFI") === "mock";
}

async function openImpl(params: OpenParams): Promise<Device> {
  const timeoutMs = params.timeoutMs ?? 3000;
  if (shouldUseMock()) {
    return MockReader.openTcp(params.ip, params.port, timeoutMs);
  }
  return Reader.openTcp(params.ip, params.port, timeoutMs);
}

const handlers: DriverHandlers = {
  async "connection.info"(device) {
    return await (device as ReaderLike).getDeviceInfo();
  },
  async "workmode.get"(device) {
    return { workMode: await (device as ReaderLike).getWorkMode() };
  },
  async "workmode.set"(device, p) {
    await (device as ReaderLike).setWorkMode(assertByte(p.workMode, "workMode"));
    return {};
  },
  async "remotenet.get"(device) {
    return await (device as ReaderLike).getRemoteNetInfo();
  },
  async "remotenet.set"(device, p) {
    await (device as ReaderLike).setRemoteNetInfo({
      enabled: Boolean(p.enabled),
      ip: assertIPv4(p.ip, "ip"),
      port: assertU16(p.port, "port"),
      heartTime: assertByte(p.heartTime, "heartTime"),
    });
    return {};
  },
  async "whitelist.get"(device, p) {
    const cards = await (device as ReaderLike).getWhitelist(p?.timeoutMs ?? 2000);
    return { cards: cards.map((c) => bytesToHex(c)) };
  },
  async "whitelist.set"(device, p) {
    if (!Array.isArray(p.cards)) throw new Error("cards must be an array of hex strings");
    const cards = p.cards.map((c, i) => {
      if (typeof c !== "string") throw new Error(`cards[${i}]: expected hex string`);
      return hexToBytes(c);
    });
    const { uploaded } = await (device as ReaderLike).setWhitelist(cards);
    return { uploaded };
  },
};

export const chafonM200Driver: Driver = {
  id: "chafon-m200",
  name: "Chafon M200 RFID Reader",
  description: "UHF RFID reader (TCP, port 9090 by default)",
  capabilities: ["device_info", "work_mode", "remote_server", "whitelist"],
  nativeLibs: ["libCFApi.so", "libhid.so"],
  open: openImpl,
  handlers,
};
