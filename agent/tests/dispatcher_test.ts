import { assertEquals } from "jsr:@std/assert@^1";
import { Dispatcher } from "../dispatcher.ts";
import { initBuiltinDrivers } from "../drivers/index.ts";

// Force the chafon driver to use the mock FFI.
Deno.env.set("CHYI_CFG_FFI", "mock");
initBuiltinDrivers();

const CHAFON = "chafon-m200";

Deno.test("connection.open + connection.info + connection.close", async () => {
  const d = new Dispatcher(8);

  const openRes = await d.dispatch(
    "connection.open",
    { driver: CHAFON, ip: "192.168.1.42", port: 8888 },
    "t1",
  );
  assertEquals(openRes.ok, true);

  const infoRes = await d.dispatch("connection.info", {}, "t2");
  assertEquals(infoRes.ok, true);

  const closeRes = await d.dispatch("connection.close", {}, "t3");
  assertEquals(closeRes.ok, true);

  await d.shutdown();
});

Deno.test("workmode.set is RMW-preserving (mock level)", async () => {
  const d = new Dispatcher(8);
  await d.dispatch("connection.open", {
    driver: CHAFON,
    ip: "1.2.3.4",
    port: 1,
  }, "t1");

  const setRes = await d.dispatch("workmode.set", { workMode: 2 }, "t2");
  assertEquals(setRes.ok, true);

  const getRes = await d.dispatch("workmode.get", {}, "t3");
  assertEquals(getRes.ok, true);
  assertEquals(
    (getRes as { ok: true; data: { workMode: number } }).data.workMode,
    2,
  );

  await d.shutdown();
});

Deno.test("whitelist round-trip via hex strings", async () => {
  const d = new Dispatcher(8);
  await d.dispatch("connection.open", {
    driver: CHAFON,
    ip: "1.2.3.4",
    port: 1,
  }, "t1");

  const setRes = await d.dispatch(
    "whitelist.set",
    { cards: ["DEADBEEF", "1122AABB"] },
    "t2",
  );
  assertEquals(setRes.ok, true);

  const getRes = await d.dispatch("whitelist.get", {}, "t3");
  assertEquals(getRes.ok, true);
  assertEquals(
    (getRes as { ok: true; data: { cards: string[] } }).data.cards,
    ["DEADBEEF", "1122AABB"],
  );

  await d.shutdown();
});

Deno.test("rejects unknown command", async () => {
  const d = new Dispatcher(8);
  const res = await d.dispatch("not.a.real.cmd" as "connection.info", {}, "t1");
  assertEquals(res.ok, false);
  await d.shutdown();
});

Deno.test("returns NOT_OPEN when reader not opened", async () => {
  const d = new Dispatcher(8);
  const res = await d.dispatch("connection.info", {}, "t1");
  assertEquals(res.ok, false);
  await d.shutdown();
});
