import { useEffect, useState } from "preact/hooks";
import AgentStatusBanner from "./AgentStatusBanner.tsx";
import FeatureNav from "../../components/live/FeatureNav.tsx";
import {
  loadActiveSession,
  loadStoredToken,
  useAgentSocket,
} from "./useAgentSocket.ts";
import { WORK_MODE_LABELS } from "../../shared/types.ts";
import Toast from "../../components/live/Toast.tsx";

interface Props {
  agentId: string;
}

export default function WorkModeEditor({ agentId }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [tokenLoaded, setTokenLoaded] = useState(false);
  const [current, setCurrent] = useState<number | null>(null);
  const [draft, setDraft] = useState<number>(0);
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
    void socket.request("workmode.get", {}).then((r) => {
      setCurrent(r.workMode);
      setDraft(r.workMode);
    }).catch((e) => setErr(describe(e)));
  }, [socket.state, socket.agentConnected]);

  if (!tokenLoaded) return null;
  if (!token) return <NotPaired agentId={agentId} />;

  const dirty = current !== null && draft !== current;

  const save = async () => {
    setBusy(true);
    setErr("");
    setOkMsg("");
    try {
      await socket.request("workmode.set", { workMode: draft });
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
        active="work_mode"
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
        <h2 class="font-semibold text-gray-900">Work mode</h2>
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
                Read-modify-write: only the WORKMODE field changes on the
                reader. All other DevicePara values (frequency, antenna, power)
                are preserved.
              </p>
              <fieldset class="space-y-2">
                {([0, 1, 2] as const).map((m) => (
                  <label
                    key={m}
                    class="flex items-start gap-2 cursor-pointer rounded-md border border-gray-200 p-2 hover:bg-gray-50"
                  >
                    <input
                      type="radio"
                      name="workmode"
                      value={m}
                      checked={draft === m}
                      onChange={() => setDraft(m)}
                      class="mt-0.5"
                    />
                    <div>
                      <div class="text-sm font-medium text-gray-900">
                        {m} — {WORK_MODE_LABELS[m]}
                      </div>
                    </div>
                  </label>
                ))}
              </fieldset>
              <div class="flex items-center gap-3 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={save}
                  disabled={!dirty || busy}
                  class="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {busy ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setDraft(current ?? 0)}
                  disabled={!dirty || busy}
                  class="text-xs text-gray-500 hover:text-gray-900 underline disabled:opacity-50"
                >
                  Reset
                </button>
                {dirty && (
                  <span class="ml-auto text-xs text-amber-600">
                    {current} → {draft}
                  </span>
                )}
              </div>
            </>
          )}
      </div>
    </div>
  );
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
