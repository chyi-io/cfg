import { assertEquals, assertThrows } from "jsr:@std/assert@^1";
import {
  buildSetWhitelistPacket,
  CARD_SLOT_SIZE,
  decodeCardSlots,
  DEVICE_PARA_SIZE,
  packDeviceParaArgs,
  packRemoteNetInfo,
  REMOTE_NET_INFO_SIZE,
  unpackDevicePara,
  unpackRemoteNetInfo,
} from "../drivers/chafon-m200/structs.ts";

Deno.test("DevicePara: unpack → pack round-trips single-byte fields", () => {
  const buf = new Uint8Array(DEVICE_PARA_SIZE);
  for (let i = 0; i < DEVICE_PARA_SIZE; i++) buf[i] = i + 1;
  const p = unpackDevicePara(buf);
  const args = packDeviceParaArgs(p);
  assertEquals(args.length, 25);
  assertEquals(args[0], buf[0]);
  assertEquals(args[2], buf[2]);
});

Deno.test("DevicePara: ushort fields split high/low big-endian", () => {
  const p = unpackDevicePara(new Uint8Array(DEVICE_PARA_SIZE));
  p.startFreqI = 0x1234;
  p.startFreqD = 0xabcd;
  p.stepFreq = 0x00ff;
  const args = packDeviceParaArgs(p);
  assertEquals(args[8], 0x12);
  assertEquals(args[9], 0x34);
  assertEquals(args[10], 0xab);
  assertEquals(args[11], 0xcd);
  assertEquals(args[12], 0x00);
  assertEquals(args[13], 0xff);
});

Deno.test("RemoteNetInfo: pack → unpack round-trip", () => {
  const info = { enabled: true, ip: "192.168.1.42", port: 8080, heartTime: 30 };
  const bytes = packRemoteNetInfo(info);
  assertEquals(bytes.length, REMOTE_NET_INFO_SIZE);
  assertEquals(bytes[0], 1);
  assertEquals(bytes[1], 192);
  assertEquals(bytes[5], 0x1f);
  assertEquals(bytes[6], 0x90);
  const back = unpackRemoteNetInfo(bytes);
  assertEquals(back.enabled, true);
  assertEquals(back.ip, "192.168.1.42");
  assertEquals(back.port, 8080);
  assertEquals(back.heartTime, 30);
});

Deno.test("RemoteNetInfo: rejects invalid IP", () => {
  assertThrows(() =>
    packRemoteNetInfo({ enabled: true, ip: "not-an-ip", port: 1, heartTime: 1 })
  );
  assertThrows(() =>
    packRemoteNetInfo({ enabled: false, ip: "1.2.3", port: 1, heartTime: 1 })
  );
});

Deno.test("Whitelist packet: packet index big-endian + per-slot encoding", () => {
  const card1 = new Uint8Array([0xaa, 0xbb, 0xcc]);
  const card2 = new Uint8Array([0x11, 0x22]);
  const packet = buildSetWhitelistPacket(5, [card1, card2]);
  assertEquals(packet[0], 0x00);
  assertEquals(packet[1], 0x05);
  assertEquals(packet[2], 2);
  assertEquals(packet[3], 3);
  assertEquals(packet[3 + 1], 0xaa);
  assertEquals(packet[3 + CARD_SLOT_SIZE], 2);
  assertEquals(packet[3 + CARD_SLOT_SIZE + 1], 0x11);
});

Deno.test("Whitelist decode: trims empty slots", () => {
  const payload = new Uint8Array(CARD_SLOT_SIZE * 3);
  payload[0] = 3;
  payload[1] = 0xde;
  payload[2] = 0xad;
  payload[3] = 0xbe;
  payload[CARD_SLOT_SIZE] = 0;
  payload[CARD_SLOT_SIZE * 2] = 2;
  payload[CARD_SLOT_SIZE * 2 + 1] = 0x11;
  payload[CARD_SLOT_SIZE * 2 + 2] = 0x22;
  const cards = decodeCardSlots(payload, 3);
  assertEquals(cards.length, 2);
  assertEquals(cards[0], new Uint8Array([0xde, 0xad, 0xbe]));
  assertEquals(cards[1], new Uint8Array([0x11, 0x22]));
});
