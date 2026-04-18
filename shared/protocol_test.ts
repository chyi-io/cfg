import { assertEquals } from "jsr:@std/assert@^1";
import { stripAgentWsPath, wsUrlToHttp } from "./protocol.ts";

Deno.test("wsUrlToHttp: ws → http (regression: must not become https)", () => {
  assertEquals(
    wsUrlToHttp("ws://localhost:8001/api/agent/ws"),
    "http://localhost:8001/api/agent/ws",
  );
});

Deno.test("wsUrlToHttp: wss → https", () => {
  assertEquals(
    wsUrlToHttp("wss://cfg.chyi.io/api/agent/ws"),
    "https://cfg.chyi.io/api/agent/ws",
  );
});

Deno.test("wsUrlToHttp: passes other schemes through", () => {
  assertEquals(wsUrlToHttp("https://example.com"), "https://example.com");
  assertEquals(wsUrlToHttp("file:///tmp/foo"), "file:///tmp/foo");
});

Deno.test("stripAgentWsPath: removes /api/agent/ws suffix", () => {
  assertEquals(
    stripAgentWsPath("https://cfg.chyi.io/api/agent/ws"),
    "https://cfg.chyi.io",
  );
  assertEquals(
    stripAgentWsPath("http://localhost:8001/api/agent/ws"),
    "http://localhost:8001",
  );
});

Deno.test("stripAgentWsPath: leaves unrelated paths alone", () => {
  assertEquals(stripAgentWsPath("https://cfg.chyi.io"), "https://cfg.chyi.io");
  assertEquals(
    stripAgentWsPath("https://cfg.chyi.io/foo/bar"),
    "https://cfg.chyi.io/foo/bar",
  );
});
