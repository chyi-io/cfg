import { useEffect, useState } from "preact/hooks";
import AgentStatusBanner from "./AgentStatusBanner.tsx";
import FeatureNav from "../../components/live/FeatureNav.tsx";
import {
  clearActiveSession,
  clearToken,
  loadActiveSession,
  loadStoredToken,
  saveActiveSession,
  useAgentSocket,
} from "./useAgentSocket.ts";
import type { Capability, DriverInfo } from "../../shared/capabilities.ts";
import Toast from "../../components/live/Toast.tsx";

interface Props {
  agentId: string;
}

const PORT_DEFAULTS: Record<string, number> = {
  "chafon-m200": 9090,
};

export default function AgentDashboard({ agentId }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [tokenLoaded, setTokenLoaded] = useState(false);
  const [drivers, setDrivers] = useState<DriverInfo[]>([]);
  const [info, setInfo] = useState<Record<string, unknown> | null>(null);
  const [activeDriver, setActiveDriver] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [connectForm, setConnectForm] = useState({
    driver: "",
    ip: "192.168.1.250",
    port: 9090,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const stored = loadStoredToken();
    if (stored && stored.agentId === agentId) setToken(stored.token);
    setTokenLoaded(true);
  }, [agentId]);

  const socket = useAgentSocket(token);

  // Load drivers list on connect.
  useEffect(() => {
    if (socket.state !== "open" || !socket.agentConnected) return;
    void socket.request("drivers.list", {}).then((r) => {
      setDrivers(r.drivers);
      setConnectForm((f) => ({
        ...f,
        driver: f.driver || r.drivers[0]?.id || "",
        port: PORT_DEFAULTS[f.driver || r.drivers[0]?.id || ""] ?? f.port,
      }));
    }).catch((e) => setErr(describeError(e)));

    void socket.request("connection.status", {}).then((s) => {
      if (s.open) {
        setInfo(s.info as Record<string, unknown> ?? null);
        if (s.driver) setActiveDriver(s.driver);
        if (s.capabilities) {
          setCapabilities(s.capabilities);
          saveActiveSession({ driver: s.driver ?? "", capabilities: s.capabilities });
        }
      }
    }).catch(() => {
      // benign — no reader open
    });
  }, [socket.state, socket.agentConnected]);

  if (!tokenLoaded) return null;
  if (!token) return <NotPairedBanner agentId={agentId} />;

  const connect = async (e: Event) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const res = await socket.request("connection.open", {
        driver: connectForm.driver,
        ip: connectForm.ip,
        port: connectForm.port,
      });
      setInfo(res.deviceInfo as Record<string, unknown>);
      setActiveDriver(res.driver);
      setCapabilities(res.capabilities);
      saveActiveSession({ driver: res.driver, capabilities: res.capabilities });
    } catch (e) {
      setErr(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    setErr("");
    try {
      await socket.request("connection.close", {});
      setInfo(null);
      setActiveDriver(null);
      setCapabilities([]);
      clearActiveSession();
    } catch (e) {
      setErr(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  const unpair = () => {
    clearToken();
    clearActiveSession();
    socket.close();
    location.href = "/live";
  };

  const onDriverChange = (id: string) => {
    setConnectForm({
      ...connectForm,
      driver: id,
      port: PORT_DEFAULTS[id] ?? connectForm.port,
    });
  };

  return (
    <div class="space-y-4">
      <AgentStatusBanner
        state={socket.state}
        agentConnected={socket.agentConnected}
        agentId={agentId}
      />

      <FeatureNav agentId={agentId} active="info" capabilities={capabilities} />

      {err && <Toast kind="error" message={err} onDismiss={() => setErr("")} />}

      {!info
        ? (
          <form onSubmit={connect} class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-3">
            <h2 class="font-semibold text-gray-900">Connect to a device</h2>

            {drivers.length === 0
              ? <p class="text-sm text-gray-500">Loading available drivers...</p>
              : (
                <label class="block text-sm">
                  <span class="text-gray-700">Driver</span>
                  <select
                    value={connectForm.driver}
                    onChange={(e) => onDriverChange((e.target as HTMLSelectElement).value)}
                    class="mt-1 w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm bg-white"
                  >
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} — {d.description}
                      </option>
                    ))}
                  </select>
                </label>
              )}

            <div class="grid grid-cols-2 gap-3">
              <label class="block text-sm">
                <span class="text-gray-700">IP</span>
                <input
                  type="text"
                  value={connectForm.ip}
                  onInput={(e) =>
                    setConnectForm({ ...connectForm, ip: (e.target as HTMLInputElement).value })}
                  class="mt-1 w-full rounded-md border border-gray-200 px-2 py-1.5 font-mono text-sm"
                />
              </label>
              <label class="block text-sm">
                <span class="text-gray-700">Port</span>
                <input
                  type="number"
                  value={connectForm.port}
                  onInput={(e) =>
                    setConnectForm({
                      ...connectForm,
                      port: Number.parseInt((e.target as HTMLInputElement).value, 10) || 0,
                    })}
                  class="mt-1 w-full rounded-md border border-gray-200 px-2 py-1.5 font-mono text-sm"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={busy || !connectForm.driver || socket.state !== "open" || !socket.agentConnected}
              class="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {busy ? "Connecting..." : "Connect"}
            </button>
          </form>
        )
        : (
          <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="font-semibold text-gray-900">Device info</h2>
                <p class="text-xs text-gray-500 mt-0.5">
                  Driver: <span class="font-mono">{activeDriver}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={disconnect}
                disabled={busy}
                class="text-xs text-gray-500 hover:text-red-600 underline"
              >
                Disconnect
              </button>
            </div>
            <DeviceInfoTable info={info} />
          </div>
        )}

      <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="font-semibold text-gray-900">Session</h2>
            <p class="text-xs text-gray-500 mt-0.5">
              Paired with <span class="font-mono">{agentId.substring(0, 8)}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={unpair}
            class="text-xs text-gray-500 hover:text-red-600 underline"
          >
            Unpair this browser
          </button>
        </div>
      </div>
    </div>
  );
}

function DeviceInfoTable({ info }: { info: Record<string, unknown> }) {
  const entries = Object.entries(info);
  if (entries.length === 0) {
    return <p class="text-sm text-gray-500">No info reported by this device.</p>;
  }
  return (
    <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
      {entries.map(([k, v]) => (
        <>
          <dt class="text-gray-500">{humanize(k)}</dt>
          <dd class={looksMono(v) ? "font-mono text-xs text-gray-900 break-all" : "text-gray-900"}>
            {render(v)}
          </dd>
        </>
      ))}
    </dl>
  );
}

function humanize(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .replace(/\bSn\b/i, "SN")
    .replace(/\bIp\b/i, "IP");
}

function looksMono(v: unknown): boolean {
  if (typeof v !== "string") return false;
  return /^[A-F0-9]+$/i.test(v) && v.length >= 12;
}

function render(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "yes" : "no";
  return String(v);
}

function NotPairedBanner({ agentId }: { agentId: string }) {
  return (
    <div class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      This browser is not paired with agent <span class="font-mono">{agentId.substring(0, 8)}</span>.
      {" "}
      <a href="/live" class="underline font-semibold">Pair now →</a>
    </div>
  );
}

function describeError(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return String(e);
}
