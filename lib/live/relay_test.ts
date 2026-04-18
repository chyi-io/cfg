// Smoke test for the in-process registry. BroadcastChannel routing across
// isolates can't be exercised here — this just validates the local maps.

import { assertEquals } from "jsr:@std/assert@^1";
import {
  hasLocalAgent,
  registerAgent,
  registerBrowser,
  unregisterAgent,
} from "./relay.ts";

function fakeWs(): WebSocket {
  return {
    readyState: 1,
    send: () => {},
    close: () => {},
  } as unknown as WebSocket;
}

Deno.test("registry: agent register/unregister", () => {
  const ws = fakeWs();
  registerAgent("agent-1", ws);
  assertEquals(hasLocalAgent("agent-1"), true);
  unregisterAgent("agent-1", ws);
  assertEquals(hasLocalAgent("agent-1"), false);
});

Deno.test("registry: browser registers under existing agent", () => {
  const aWs = fakeWs();
  registerAgent("agent-2", aWs);
  const handle = registerBrowser("agent-2", fakeWs());
  assertEquals(handle.agentId, "agent-2");
  handle.dispose();
  unregisterAgent("agent-2", aWs);
});
