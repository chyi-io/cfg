import type {
  AckEnvelope,
  ChallengeEnvelope,
  ChallengeResponseEnvelope,
  Envelope,
  HelloEnvelope,
  ReqEnvelope,
  ResEnvelope,
} from "../shared/protocol.ts";
import { decode, encode, PROTOCOL_VERSION } from "../shared/protocol.ts";
import { hmacHex } from "../shared/pair.ts";
import { version } from "../shared/version.ts";
import { log } from "./log.ts";
import type { AgentConfig } from "./config.ts";
import type { Dispatcher } from "./dispatcher.ts";

export interface WsClientEvents {
  onPairCode: (code: string, expiresAt: number) => void;
  onReady: () => void;
  onClose: () => void;
}

export class WsClient {
  private socket: WebSocket | null = null;
  private backoffMs = 1000;
  private stopped = false;
  private pingTimer: number | null = null;

  constructor(
    private config: AgentConfig,
    private dispatcher: Dispatcher,
    private events: WsClientEvents,
  ) {}

  start(): void {
    void this.loop();
  }

  stop(): void {
    this.stopped = true;
    this.clearPing();
    this.socket?.close();
  }

  private async loop(): Promise<void> {
    while (!this.stopped) {
      try {
        await this.connectOnce();
      } catch (err) {
        log.warn("ws.error", {
          message: err instanceof Error ? err.message : String(err),
        });
      }
      if (this.stopped) break;
      const wait = this.backoffMs + Math.floor(Math.random() * 500);
      log.info("ws.reconnect", { waitMs: wait });
      await new Promise((r) => setTimeout(r, wait));
      this.backoffMs = Math.min(this.backoffMs * 2, 30000);
    }
  }

  private connectOnce(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      log.info("ws.connect", { url: this.config.cloudUrl });
      const ws = new WebSocket(this.config.cloudUrl);
      this.socket = ws;

      ws.onopen = () => {
        log.info("ws.open", {});
        const hello: HelloEnvelope = {
          kind: "hello",
          agentId: this.config.agentId,
          agentVersion: version(),
          protocolVersion: PROTOCOL_VERSION,
        };
        ws.send(encode(hello));
      };

      ws.onmessage = (ev) => {
        void this.handleMessage(ws, ev.data as string);
      };

      ws.onerror = (ev) => {
        log.warn("ws.error", {
          event: (ev as ErrorEvent).message ?? "unknown",
        });
      };

      ws.onclose = () => {
        log.info("ws.close", {});
        this.clearPing();
        this.events.onClose();
        resolve();
      };

      setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.close();
          reject(new Error("connect timeout"));
        }
      }, 10000);
    });
  }

  private async handleMessage(ws: WebSocket, data: string): Promise<void> {
    let env: Envelope;
    try {
      env = decode(data);
    } catch (err) {
      log.warn("ws.parse_error", {
        message: err instanceof Error ? err.message : String(err),
      });
      return;
    }

    switch (env.kind) {
      case "ack": {
        const ack = env as AckEnvelope;
        if (!ack.ok) {
          log.error("ws.register_failed", { error: ack.error });
          ws.close();
          return;
        }
        if (ack.pairCode && ack.pairCodeExpiresAt) {
          this.events.onPairCode(ack.pairCode, ack.pairCodeExpiresAt);
        }
        this.backoffMs = 1000;
        this.startPing(ws);
        this.events.onReady();
        return;
      }
      case "challenge": {
        const sig = await hmacHex(
          this.config.agentKey,
          (env as ChallengeEnvelope).nonce,
        );
        const cr: ChallengeResponseEnvelope = {
          kind: "challenge_response",
          agentId: this.config.agentId,
          sig,
        };
        ws.send(encode(cr));
        return;
      }
      case "req": {
        const req = env as ReqEnvelope;
        const result = await this.dispatcher.dispatch(
          req.cmd,
          req.payload,
          req.traceId,
        );
        const res: ResEnvelope = result.ok
          ? {
            kind: "res",
            id: req.id,
            traceId: req.traceId,
            ok: true,
            data: result.data,
          }
          : {
            kind: "res",
            id: req.id,
            traceId: req.traceId,
            ok: false,
            error: result.error,
          };
        ws.send(encode(res));
        return;
      }
      case "ping": {
        ws.send(encode({ kind: "pong", ts: Date.now() }));
        return;
      }
      case "pong":
        return;
      default:
        log.debug("ws.ignored_kind", { kind: env.kind });
    }
  }

  private startPing(ws: WebSocket): void {
    this.clearPing();
    this.pingTimer = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(encode({ kind: "ping", ts: Date.now() }));
      }
    }, 30000) as unknown as number;
  }

  private clearPing(): void {
    if (this.pingTimer !== null) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }
}
