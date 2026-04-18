import { define } from "../../../utils.ts";
import { decode, encode, type Envelope } from "../../../shared/protocol.ts";
import { verify } from "../../../lib/live/token.ts";
import { registerBrowser, sendToAgent } from "../../../lib/live/relay.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const upgrade = ctx.req.headers.get("upgrade") ?? "";
    if (upgrade.toLowerCase() !== "websocket") {
      return new Response("Expected WebSocket upgrade", { status: 426 });
    }
    const url = new URL(ctx.req.url);
    const token = url.searchParams.get("token");
    if (!token) return new Response("Missing token", { status: 401 });

    const payload = await verify(token);
    if (!payload) return new Response("Invalid or expired token", { status: 401 });
    const agentId = payload.agentId;

    const { socket, response } = Deno.upgradeWebSocket(ctx.req);
    const handle = registerBrowser(agentId, socket);

    socket.onmessage = (ev) => {
      let env: Envelope;
      try {
        env = decode(ev.data as string);
      } catch {
        socket.close(1008, "bad envelope");
        return;
      }
      if (env.kind === "req") {
        sendToAgent(agentId, env);
        return;
      }
      if (env.kind === "ping") {
        socket.send(encode({ kind: "pong", ts: Date.now() }));
        return;
      }
      // Ignore anything else — browsers only send req/ping.
    };

    socket.onclose = () => handle.dispose();
    socket.onerror = () => handle.dispose();

    return response;
  },
});
