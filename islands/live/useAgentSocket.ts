import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import type {
  CommandName,
  CommandPayloads,
  CommandResponses,
  Envelope,
  EventName,
  ReqEnvelope,
  ResEnvelope,
} from "../../shared/protocol.ts";
import { decode, encode } from "../../shared/protocol.ts";
import type { ErrorBody } from "../../shared/errors.ts";

export type ConnectionState = "idle" | "connecting" | "open" | "closed";

export interface AgentSocket {
  state: ConnectionState;
  agentConnected: boolean;
  request<K extends CommandName>(cmd: K, payload: CommandPayloads[K]): Promise<CommandResponses[K]>;
  onEvent(event: EventName, handler: () => void): () => void;
  close(): void;
}

interface Stored {
  token: string;
  exp: number;
  agentId: string;
}

const STORAGE_KEY = "cfg-live-token";
const SESSION_KEY = "cfg-live-active";

export function loadStoredToken(): Stored | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Stored;
    if (!s.token || !s.agentId || !s.exp) return null;
    if (Date.now() > s.exp) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export function storeToken(s: Stored): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export function clearToken(): void {
  localStorage.removeItem(STORAGE_KEY);
}

import type { Capability } from "../../shared/capabilities.ts";

export interface ActiveSession {
  driver: string;
  capabilities: Capability[];
}

export function loadActiveSession(): ActiveSession | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ActiveSession;
  } catch {
    return null;
  }
}

export function saveActiveSession(s: ActiveSession): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
}

export function clearActiveSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export function useAgentSocket(token: string | null): AgentSocket {
  const [state, setState] = useState<ConnectionState>(token ? "connecting" : "idle");
  const [agentConnected, setAgentConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const pendingRef = useRef(new Map<string, {
    resolve: (data: unknown) => void;
    reject: (err: ErrorBody) => void;
  }>());
  const listenersRef = useRef(new Map<EventName, Set<() => void>>());

  const scheduleReconnect = useRef<number | null>(null);
  const backoffRef = useRef(1000);

  const send = useCallback((env: Envelope): boolean => {
    const ws = socketRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    ws.send(encode(env));
    return true;
  }, []);

  useEffect(() => {
    if (!token) {
      setState("idle");
      return;
    }
    let disposed = false;

    const connect = () => {
      if (disposed) return;
      const proto = location.protocol === "https:" ? "wss:" : "ws:";
      // Dev-only escape hatch: pages loaded from Vite (5173) can't carry
      // WebSocket upgrades through the Fresh plugin middleware, so the real
      // WS endpoint lives on the deno-serve cloud (8001). Rewrite the host
      // only in that exact localhost case; production (cfg.chyi.io) serves
      // everything from one origin and needs no rewrite.
      let host = location.host;
      if (
        (location.hostname === "localhost" || location.hostname === "127.0.0.1") &&
        location.port === "5173"
      ) {
        host = `${location.hostname}:8001`;
      }
      const url = `${proto}//${host}/api/live/ws?token=${encodeURIComponent(token)}`;
      setState("connecting");
      const ws = new WebSocket(url);
      socketRef.current = ws;

      ws.onopen = () => {
        setState("open");
        backoffRef.current = 1000;
      };

      ws.onmessage = (ev) => {
        let env: Envelope;
        try {
          env = decode(ev.data as string);
        } catch {
          return;
        }
        if (env.kind === "res") {
          const res = env as ResEnvelope;
          const p = pendingRef.current.get(res.id);
          if (!p) return;
          pendingRef.current.delete(res.id);
          if (res.ok) p.resolve(res.data);
          else p.reject(res.error);
          return;
        }
        if (env.kind === "event") {
          const ls = listenersRef.current.get(env.event);
          if (ls) for (const fn of ls) fn();
          if (env.event === "agent.connected") setAgentConnected(true);
          if (env.event === "agent.disconnected") setAgentConnected(false);
          return;
        }
      };

      ws.onclose = () => {
        setState("closed");
        socketRef.current = null;
        for (const [, p] of pendingRef.current) {
          p.reject({
            code: 0xffffff17,
            statusName: "STAT_DLL_DISCONNECT",
            httpStatus: 410,
            message: "Connection lost",
          });
        }
        pendingRef.current.clear();
        if (disposed) return;
        const wait = backoffRef.current + Math.floor(Math.random() * 500);
        backoffRef.current = Math.min(backoffRef.current * 2, 30000);
        scheduleReconnect.current = setTimeout(connect, wait) as unknown as number;
      };

      ws.onerror = () => {
        // onclose will follow.
      };
    };

    connect();

    return () => {
      disposed = true;
      if (scheduleReconnect.current !== null) {
        clearTimeout(scheduleReconnect.current);
      }
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [token]);

  const request = useCallback(
    <K extends CommandName>(cmd: K, payload: CommandPayloads[K]): Promise<CommandResponses[K]> => {
      return new Promise((resolve, reject) => {
        const id = crypto.randomUUID();
        const traceId = crypto.randomUUID();
        pendingRef.current.set(id, {
          resolve: (d) => resolve(d as CommandResponses[K]),
          reject,
        });
        const req: ReqEnvelope = { kind: "req", id, traceId, cmd, payload };
        if (!send(req)) {
          pendingRef.current.delete(id);
          reject({
            code: 0xffffff17,
            statusName: "STAT_DLL_DISCONNECT",
            httpStatus: 410,
            message: "Not connected",
          });
          return;
        }
        setTimeout(() => {
          const p = pendingRef.current.get(id);
          if (p) {
            pendingRef.current.delete(id);
            p.reject({
              code: 0xfffffe02,
              statusName: "STAT_TIMEOUT",
              httpStatus: 504,
              message: `Timed out after 10s: ${cmd}`,
            });
          }
        }, 10000);
      });
    },
    [send],
  );

  const onEvent = useCallback((event: EventName, handler: () => void) => {
    let set = listenersRef.current.get(event);
    if (!set) {
      set = new Set();
      listenersRef.current.set(event, set);
    }
    set.add(handler);
    return () => {
      set?.delete(handler);
    };
  }, []);

  const close = useCallback(() => {
    socketRef.current?.close();
  }, []);

  return { state, agentConnected, request, onEvent, close };
}
