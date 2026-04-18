// High-level Reader wrapping raw FFI calls.
//
// The SDK is not documented as thread-safe. The vendor C# sample calls
// Thread.Sleep(50) before every FFI call which hints at races — we mirror
// that with ffiPause(), and serialize calls on the same handle via an
// internal async mutex.

import { cfapi, cstr } from "./lib.ts";
import { check, ReaderError } from "../../../shared/errors.ts";
import {
  buildSetWhitelistPacket,
  CARD_SLOT_SIZE,
  decodeCardSlots,
  DEVICE_FULL_INFO_SIZE,
  DEVICE_PARA_SIZE,
  type DeviceFullInfo,
  type DevicePara,
  MAX_CARDS_PER_PACKET,
  packDeviceParaArgs,
  packRemoteNetInfo,
  REMOTE_NET_INFO_SIZE,
  type RemoteNetInfo,
  unpackDeviceFullInfo,
  unpackDevicePara,
  unpackRemoteNetInfo,
  unpackWhiteListChunk,
  WHITELIST_BUFFER_SIZE,
} from "./structs.ts";
import type { ReaderLike } from "./reader_interface.ts";

const FFI_PAUSE_MS = 50;
function ffiPause(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, FFI_PAUSE_MS));
}

class AsyncMutex {
  private last: Promise<unknown> = Promise.resolve();
  run<T>(task: () => Promise<T>): Promise<T> {
    const prev = this.last;
    let release!: () => void;
    this.last = new Promise<void>((res) => (release = res));
    return prev.catch(() => undefined).then(task).finally(release);
  }
}

export class Reader implements ReaderLike {
  readonly id: string;
  private handle: bigint;
  private mutex = new AsyncMutex();
  private closed = false;

  private constructor(id: string, handle: bigint) {
    this.id = id;
    this.handle = handle;
  }

  static openTcp(ip: string, port: number, timeoutMs: number): Reader {
    if (port < 0 || port > 65535) throw new Error(`Invalid port: ${port}`);
    if (timeoutMs < 0) throw new Error(`Invalid timeout: ${timeoutMs}`);
    const handleArrBuf = new ArrayBuffer(8);
    const handleBytes = new Uint8Array(handleArrBuf);
    const ipBuf = cstr(ip);
    const rc = cfapi().OpenNetConnection(
      handleBytes,
      ipBuf,
      port,
      BigInt(timeoutMs),
    ) as number;
    check(rc, `OpenNetConnection(${ip}:${port})`);
    const handle = new BigInt64Array(handleArrBuf)[0];
    if (handle === 0n) {
      throw new ReaderError(
        0xffffff03,
        "OpenNetConnection returned NULL handle",
      );
    }
    return new Reader(crypto.randomUUID(), handle);
  }

  close(): Promise<void> {
    return this.mutex.run(async () => {
      if (this.closed) return;
      this.closed = true;
      await ffiPause();
      const rc = cfapi().CloseDevice(this.handle) as number;
      if (rc !== 0) {
        console.warn(
          `[reader ${this.id}] CloseDevice returned 0x${
            (rc >>> 0).toString(16)
          }`,
        );
      }
    });
  }

  isClosed(): boolean {
    return this.closed;
  }

  getDeviceInfo(): Promise<DeviceFullInfo> {
    return this.mutex.run(async () => {
      this.assertOpen();
      const buf = new Uint8Array(DEVICE_FULL_INFO_SIZE);
      await ffiPause();
      const rc = cfapi().GetDeviceInfo(this.handle, buf) as number;
      check(rc, "GetDeviceInfo");
      return unpackDeviceFullInfo(buf);
    });
  }

  getDevicePara(): Promise<DevicePara> {
    return this.mutex.run(async () => {
      this.assertOpen();
      const buf = new Uint8Array(DEVICE_PARA_SIZE);
      await ffiPause();
      const rc = cfapi().GetDevicePara(this.handle, buf) as number;
      check(rc, "GetDevicePara");
      return unpackDevicePara(buf);
    });
  }

  setDevicePara(p: DevicePara): Promise<void> {
    return this.mutex.run(async () => {
      this.assertOpen();
      const args = packDeviceParaArgs(p);
      await ffiPause();
      const rc = (cfapi().SetDevicePara_J as (...a: unknown[]) => number)(
        this.handle,
        ...args,
      );
      check(rc, "SetDevicePara_J");
    });
  }

  getRemoteNetInfo(): Promise<RemoteNetInfo> {
    return this.mutex.run(async () => {
      this.assertOpen();
      const buf = new Uint8Array(REMOTE_NET_INFO_SIZE);
      await ffiPause();
      const rc = cfapi().GetRemoteNetInfo(this.handle, buf) as number;
      check(rc, "GetRemoteNetInfo");
      return unpackRemoteNetInfo(buf);
    });
  }

  setRemoteNetInfo(info: RemoteNetInfo): Promise<void> {
    return this.mutex.run(async () => {
      this.assertOpen();
      const structBytes = packRemoteNetInfo(info);
      await ffiPause();
      const rc = cfapi().SetRemoteNetInfo(this.handle, structBytes) as number;
      check(rc, "SetRemoteNetInfo");
    });
  }

  async getWorkMode(): Promise<number> {
    const p = await this.getDevicePara();
    return p.workMode;
  }

  async setWorkMode(workMode: number): Promise<void> {
    if (workMode < 0 || workMode > 255) {
      throw new Error(`Invalid workMode: ${workMode}`);
    }
    const current = await this.getDevicePara();
    await this.setDevicePara({ ...current, workMode });
  }

  getWhitelist(timeoutMs = 2000): Promise<Uint8Array[]> {
    const MAX_CHUNKS = 256;
    return this.mutex.run(async () => {
      this.assertOpen();
      const cards: Uint8Array[] = [];
      let lastFrame = -1;
      for (let i = 0; i < MAX_CHUNKS; i++) {
        const buf = new Uint8Array(WHITELIST_BUFFER_SIZE);
        await ffiPause();
        const rc = cfapi().GetWhiteList(this.handle, buf, timeoutMs) as number;
        const u = rc >>> 0;
        if (u === 0xffffff15 || u === 0xffffff07) break;
        check(rc, "GetWhiteList");
        const chunk = unpackWhiteListChunk(buf);
        if (chunk.infoCount === 0) break;
        cards.push(...decodeCardSlots(chunk.payload, chunk.infoCount));
        if (chunk.frameNum === lastFrame) break;
        lastFrame = chunk.frameNum;
      }
      return cards;
    });
  }

  setWhitelist(cards: Uint8Array[]): Promise<{ uploaded: number }> {
    return this.mutex.run(async () => {
      this.assertOpen();
      for (let i = 0; i < cards.length; i++) {
        if (cards[i].length === 0 || cards[i].length > CARD_SLOT_SIZE - 1) {
          throw new Error(
            `Invalid card #${i}: length ${cards[i].length} (must be 1..${
              CARD_SLOT_SIZE - 1
            })`,
          );
        }
      }

      const packetCount = Math.max(
        1,
        Math.ceil(cards.length / MAX_CARDS_PER_PACKET),
      );

      const paraBefore = await this.getDevicePara_locked();
      const originalWorkMode = paraBefore.workMode;

      try {
        if (originalWorkMode !== 0) {
          await this.setDevicePara_locked({ ...paraBefore, workMode: 0 });
        }

        await ffiPause();
        const beginRc = cfapi().BeginWhiteList(
          this.handle,
          1,
          packetCount,
        ) as number;
        check(beginRc, "BeginWhiteList");

        for (let p = 0; p < packetCount; p++) {
          const slice = cards.slice(
            p * MAX_CARDS_PER_PACKET,
            (p + 1) * MAX_CARDS_PER_PACKET,
          );
          if (slice.length === 0) continue;
          const packet = buildSetWhitelistPacket(p + 1, slice);
          await new Promise<void>((r) => setTimeout(r, 5));
          const rc = cfapi().SetWhiteList(
            this.handle,
            packet.byteLength,
            packet,
          ) as number;
          check(rc, `SetWhiteList(packet ${p + 1}/${packetCount})`);
        }

        const endBuf = new Uint8Array(2);
        await ffiPause();
        const endRc = cfapi().EndWhiteList(this.handle, endBuf) as number;
        check(endRc, "EndWhiteList");
        const uploadedBE = (endBuf[0] << 8) | endBuf[1];
        const uploadedLE = (endBuf[1] << 8) | endBuf[0];
        const reported =
          uploadedBE === cards.length || uploadedBE > cards.length
            ? uploadedBE
            : uploadedLE;

        if (originalWorkMode !== 0) {
          await this.setDevicePara_locked({
            ...paraBefore,
            workMode: originalWorkMode,
          });
        }
        return { uploaded: reported };
      } catch (err) {
        try {
          if (originalWorkMode !== 0) {
            await this.setDevicePara_locked({
              ...paraBefore,
              workMode: originalWorkMode,
            });
          }
        } catch (_) {
          // swallow
        }
        throw err;
      }
    });
  }

  private async getDevicePara_locked(): Promise<DevicePara> {
    this.assertOpen();
    const buf = new Uint8Array(DEVICE_PARA_SIZE);
    await ffiPause();
    const rc = cfapi().GetDevicePara(this.handle, buf) as number;
    check(rc, "GetDevicePara");
    return unpackDevicePara(buf);
  }

  private async setDevicePara_locked(p: DevicePara): Promise<void> {
    this.assertOpen();
    const args = packDeviceParaArgs(p);
    await ffiPause();
    const rc = (cfapi().SetDevicePara_J as (...a: unknown[]) => number)(
      this.handle,
      ...args,
    );
    check(rc, "SetDevicePara_J");
  }

  private assertOpen(): void {
    if (this.closed) {
      throw new ReaderError(0xffffff17, `Reader ${this.id} is closed`);
    }
  }
}
