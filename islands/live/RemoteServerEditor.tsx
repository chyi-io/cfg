import { useEffect, useState } from "preact/hooks";
import AgentStatusBanner from "./AgentStatusBanner.tsx";
import FeatureNav from "../../components/live/FeatureNav.tsx";
import {
  loadActiveSession,
  loadStoredToken,
  useAgentSocket,
} from "./useAgentSocket.ts";
import type { RemoteNetInfo } from "../../shared/types.ts";
import Toast from "../../components/live/Toast.tsx";

interface Props {
  agentId: string;
}

const EMPTY: RemoteNetInfo = {
  enabled: false,
  ip: "0.0.0.0",
  port: 0,
  heartTime: 10,
};

export default function RemoteServerEditor({ agentId }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [tokenLoaded, setTokenLoaded] = useState(false);
  const [current, setCurrent] = useState<RemoteNetInfo | null>(null);
  const [draft, setDraft] = useState<RemoteNetInfo>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");

  useEffect(() => {
    const stored = loadStoredToken();
    if (stored && stored.agentId === agentId) setToken(stored.token);
    setTokenLoaded(true);
  }, [agentId]);

  const socket = useAgentSocket(token);

  useEffect(() => {
    if (socket.state !== "open" || !socket.agentConnected) return;
    void socket.request("remotenet.get", {}).then((r) => {
      setCurrent(r);
      setDraft(r);
    }).catch((e) => setErr(describe(e)));
  }, [socket.state, socket.agentConnected]);

  if (!tokenLoaded) return null;
  if (!token) return <NotPaired agentId={agentId} />;

  const ipErr = validateIp(draft.ip);
  const portErr = validatePort(draft.port);
  const heartErr = validateHeart(draft.heartTime);
  const valid = !ipErr && !portErr && !heartErr;
  const dirty = current && JSON.stringify(current) !== JSON.stringify(draft);

  const save = async () => {
    if (!valid) return;
    setBusy(true);
    setErr("");
    setOkMsg("");
    try {
      await socket.request("remotenet.set", draft);
      setCurrent(draft);
      setOkMsg("Saved.");
    } catch (e) {
      setErr(describe(e));
    } finally {
      setBusy(false);
    }
  };

  const session = loadActiveSession();

  return (
    <div class="space-y-4">
      <AgentStatusBanner
        state={socket.state}
        agentConnected={socket.agentConnected}
        agentId={agentId}
      />

      <FeatureNav
        agentId={agentId}
        active="remote_server"
        capabilities={session?.capabilities}
      />

      {err && <Toast kind="error" message={err} onDismiss={() => setErr("")} />}
      {okMsg && (
        <Toast
          kind="success"
          message={okMsg}
          onDismiss={() => setOkMsg("")}
        />
      )}

      <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-3">
        <h2 class="font-semibold text-gray-900">Remote server</h2>
        {current === null
          ? (
            <p class="text-sm text-gray-500">
              {socket.agentConnected
                ? "Loading..."
                : "Open the connection from the device-info page first."}
            </p>
          )
          : (
            <>
              <p class="text-xs text-gray-500">
                Where the reader pushes RFID access events. Enable + set IP /
                port / heartbeat.
              </p>
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.enabled}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      enabled: (e.target as HTMLInputElement).checked,
                    })}
                />
                <span class="text-sm font-medium text-gray-800">Enabled</span>
              </label>

              <Field label="IP address" error={ipErr}>
                <input
                  type="text"
                  value={draft.ip}
                  onInput={(e) =>
                    setDraft({
                      ...draft,
                      ip: (e.target as HTMLInputElement).value,
                    })}
                  placeholder="192.168.1.100"
                  class="w-full rounded-md border border-gray-200 px-2 py-1.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Field>

              <Field label="Port" error={portErr}>
                <input
                  type="number"
                  value={draft.port}
                  onInput={(e) =>
                    setDraft({
                      ...draft,
                      port: Number.parseInt(
                        (e.target as HTMLInputElement).value,
                        10,
                      ) || 0,
                    })}
                  min={0}
                  max={65535}
                  class="w-full rounded-md border border-gray-200 px-2 py-1.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Field>

              <Field label="Heartbeat (seconds)" error={heartErr}>
                <input
                  type="number"
                  value={draft.heartTime}
                  onInput={(e) =>
                    setDraft({
                      ...draft,
                      heartTime: Number.parseInt(
                        (e.target as HTMLInputElement).value,
                        10,
                      ) || 0,
                    })}
                  min={0}
                  max={255}
                  class="w-full rounded-md border border-gray-200 px-2 py-1.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Field>

              <div class="flex items-center gap-3 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={save}
                  disabled={!dirty || !valid || busy}
                  class="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {busy ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => current && setDraft(current)}
                  disabled={!dirty || busy}
                  class="text-xs text-gray-500 hover:text-gray-900 underline disabled:opacity-50"
                >
                  Reset
                </button>
              </div>
            </>
          )}
      </div>
    </div>
  );
}

function Field(
  { label, error, children }: {
    label: string;
    error?: string;
    children: preact.ComponentChildren;
  },
) {
  return (
    <label class="block text-sm space-y-1">
      <span class="text-gray-700">{label}</span>
      {children}
      {error && <span class="text-xs text-red-600">{error}</span>}
    </label>
  );
}

function validateIp(ip: string): string | undefined {
  const parts = ip.split(".");
  if (parts.length !== 4) return "must be a dotted-quad IPv4 address";
  for (const p of parts) {
    const n = Number.parseInt(p, 10);
    if (Number.isNaN(n) || n < 0 || n > 255 || String(n) !== p) {
      return `octet "${p}" not 0-255`;
    }
  }
  return undefined;
}

function validatePort(p: number): string | undefined {
  if (!Number.isInteger(p) || p < 0 || p > 65535) return "0..65535";
  return undefined;
}

function validateHeart(p: number): string | undefined {
  if (!Number.isInteger(p) || p < 0 || p > 255) return "0..255";
  return undefined;
}

function NotPaired({ agentId }: { agentId: string }) {
  return (
    <div class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      This browser is not paired with agent{" "}
      <span class="font-mono">{agentId.substring(0, 8)}</span>.{" "}
      <a href="/live" class="underline font-semibold">Pair now →</a>
    </div>
  );
}

function describe(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) {
    return String((e as { message: unknown }).message);
  }
  return String(e);
}
