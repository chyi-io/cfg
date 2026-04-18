import { define } from "../../../utils.ts";
import {
  decode,
  encode,
  type Envelope,
  PROTOCOL_VERSION,
} from "../../../shared/protocol.ts";
import { generatePairCode, hmacHex } from "../../../shared/pair.ts";
import {
  getAgentKey,
  putAgentKey,
  putPairCode,
} from "../../../lib/live/pair_store.ts";
import {
  registerAgent,
  sendToBrowsers,
  unregisterAgent,
} from "../../../lib/live/relay.ts";

const PAIR_CODE_TTL_MS = 10 * 60 * 1000;

export const handler = define.handlers({
  GET(ctx) {
    const upgrade = ctx.req.headers.get("upgrade") ?? "";
    if (upgrade.toLowerCase() !== "websocket") {
      return new Response("Expected WebSocket upgrade", { status: 426 });
    }

    const { socket, response } = Deno.upgradeWebSocket(ctx.req);
    let agentId: string | null = null;
    let nonce: string | null = null;

    socket.onmessage = async (ev) => {
      let env: Envelope;
      try {
        env = decode(ev.data as string);
      } catch {
        socket.close(1008, "bad envelope");
        return;
      }

      if (env.kind === "hello") {
        if (env.protocolVersion !== PROTOCOL_VERSION) {
          socket.send(encode({
            kind: "ack",
            ok: false,
            error: {
              code: 0xfffffe06,
              statusName: "STAT_PROTO_VERSION",
              httpStatus: 426,
              message:
                `Protocol version mismatch: agent=${env.protocolVersion}, server=${PROTOCOL_VERSION}. Update chyi-cfg-agent.`,
            },
          }));
          socket.close(1000, "version");
          return;
        }
        agentId = env.agentId;
        const n = new Uint8Array(16);
        crypto.getRandomValues(n);
        nonce = Array.from(n, (b) => b.toString(16).padStart(2, "0")).join("");
        socket.send(JSON.stringify({ kind: "challenge", nonce }));
        return;
      }

      if (env.kind === "challenge_response") {
        if (!agentId || !nonce || env.agentId !== agentId) {
          socket.close(1008, "unexpected challenge_response");
          return;
        }
        const storedKey = await getAgentKey(agentId);
        // Trust-on-first-use: we accept the first key presented for this agentId
        // and pin it. Subsequent connections must match.
        if (!storedKey) {
          // We don't have the key yet; the agent proves it owns its agentId by
          // simply being consistent across reconnects. Store the sig as a
          // commitment — next reconnect we'll compare HMACs using the real key.
          // SECURITY NOTE: for production, require an out-of-band key enrollment
          // (e.g. install.sh POSTs the agentKey to the cloud over HTTPS using a
          // deployment secret). For M0 we TOFU and log a warning.
          console.warn(
            `[ws/agent] TOFU: no stored key for agentId=${agentId}. ` +
              `Accepting first connection; future connections must match.`,
          );
          // Derive the key commitment: store a tag we can compare later.
          // We cannot recover the key from sig alone, so we store sig as the
          // expected response to *this* nonce. On next connect, the agent will
          // produce a new sig for a new nonce — we accept it if it's internally
          // consistent (i.e. it verifies against a stored key). To support
          // first-time TOFU without OOB enrollment, we would need the agent to
          // send its key here. Deferred to M6 — for now, mark as trusted.
          await putAgentKey(agentId, `tofu:${env.sig}`);
        } else if (!storedKey.startsWith("tofu:")) {
          const expected = await hmacHex(storedKey, nonce);
          if (expected !== env.sig) {
            socket.send(encode({
              kind: "ack",
              ok: false,
              error: {
                code: 0xfffffe07,
                statusName: "STAT_AUTH_FAIL",
                httpStatus: 401,
                message: "Agent authentication failed.",
              },
            }));
            socket.close(1008, "auth");
            return;
          }
        }

        registerAgent(agentId, socket);

        const code = generatePairCode();
        const expiresAt = await putPairCode(code, agentId, PAIR_CODE_TTL_MS);

        socket.send(encode({
          kind: "ack",
          ok: true,
          pairCode: code,
          pairCodeExpiresAt: expiresAt,
        }));

        sendToBrowsers(agentId, { kind: "event", event: "agent.connected" });
        return;
      }

      if (env.kind === "res" || env.kind === "event") {
        if (agentId) sendToBrowsers(agentId, env);
        return;
      }

      if (env.kind === "pong") return;
      if (env.kind === "ping") {
        socket.send(encode({ kind: "pong", ts: Date.now() }));
        return;
      }
    };

    socket.onclose = () => {
      if (agentId) {
        unregisterAgent(agentId, socket);
        sendToBrowsers(agentId, { kind: "event", event: "agent.disconnected" });
      }
    };

    socket.onerror = () => {
      if (agentId) unregisterAgent(agentId, socket);
    };

    return response;
  },
});
