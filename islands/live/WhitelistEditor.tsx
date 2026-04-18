import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import AgentStatusBanner from "./AgentStatusBanner.tsx";
import FeatureNav from "../../components/live/FeatureNav.tsx";
import { loadActiveSession, loadStoredToken, useAgentSocket } from "./useAgentSocket.ts";
import Toast from "../../components/live/Toast.tsx";

interface Props {
  agentId: string;
}

const HEX_RE = /^[0-9A-F]+$/;

export default function WhitelistEditor({ agentId }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [tokenLoaded, setTokenLoaded] = useState(false);
  const [current, setCurrent] = useState<string[] | null>(null);
  const [draft, setDraft] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [confirming, setConfirming] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const stored = loadStoredToken();
    if (stored && stored.agentId === agentId) setToken(stored.token);
    setTokenLoaded(true);
  }, [agentId]);

  const socket = useAgentSocket(token);

  useEffect(() => {
    if (socket.state !== "open" || !socket.agentConnected) return;
    void refresh();
  }, [socket.state, socket.agentConnected]);

  const refresh = async () => {
    setBusy(true);
    setErr("");
    try {
      const r = await socket.request("whitelist.get", {});
      setCurrent(r.cards);
      setDraft(r.cards);
    } catch (e) {
      setErr(describe(e));
    } finally {
      setBusy(false);
    }
  };

  const filtered = useMemo(() => {
    if (!draft) return [];
    if (!search) return draft;
    const q = search.toUpperCase();
    return draft.filter((c) => c.includes(q));
  }, [draft, search]);

  const diff = useMemo(() => computeDiff(current ?? [], draft), [current, draft]);

  if (!tokenLoaded) return null;
  if (!token) return <NotPaired agentId={agentId} />;

  const onImportFile = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const text = await file.text();
    const { cards, errors } = parseCsvCards(text);
    if (errors.length > 0) {
      setErr(`${errors.length} invalid row(s): ${errors.slice(0, 3).join("; ")}${errors.length > 3 ? "..." : ""}`);
    } else {
      setErr("");
    }
    setDraft(cards);
    setOkMsg(`Imported ${cards.length} cards from ${file.name}.`);
    if (fileRef.current) fileRef.current.value = "";
  };

  const exportCsv = () => {
    const rows = ["epc", ...(current ?? [])];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `whitelist-${agentId.substring(0, 8)}-${new Date().toISOString().substring(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const writeNow = async () => {
    setBusy(true);
    setErr("");
    setOkMsg("");
    try {
      const r = await socket.request("whitelist.set", { cards: draft });
      setOkMsg(`Uploaded ${r.uploaded} cards.`);
      await refresh();
    } catch (e) {
      setErr(describe(e));
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  const session = loadActiveSession();

  return (
    <div class="space-y-4">
      <AgentStatusBanner state={socket.state} agentConnected={socket.agentConnected} agentId={agentId} />

      <FeatureNav agentId={agentId} active="whitelist" capabilities={session?.capabilities} />

      {err && <Toast kind="error" message={err} onDismiss={() => setErr("")} />}
      {okMsg && <Toast kind="success" message={okMsg} onDismiss={() => setOkMsg("")} />}

      <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="font-semibold text-gray-900">
            Whitelist <span class="text-gray-400 font-normal">({draft.length} cards)</span>
          </h2>
          <div class="flex items-center gap-2">
            <button
              type="button"
              onClick={refresh}
              disabled={busy}
              class="text-xs text-gray-600 hover:text-gray-900 underline disabled:opacity-50"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={exportCsv}
              disabled={!current || current.length === 0}
              class="rounded-md border border-gray-200 px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
            >
              Export CSV
            </button>
            <label class="rounded-md border border-gray-200 px-2 py-1 text-xs hover:bg-gray-50 cursor-pointer">
              Import CSV
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv,text/plain"
                onChange={onImportFile}
                class="hidden"
              />
            </label>
          </div>
        </div>

        {current === null
          ? (
            <p class="text-sm text-gray-500">
              {socket.agentConnected ? "Loading..." : "Open the connection from the device-info page first."}
            </p>
          )
          : (
            <>
              <input
                type="search"
                placeholder="Search EPC..."
                value={search}
                onInput={(e) => setSearch((e.target as HTMLInputElement).value.toUpperCase())}
                class="w-full rounded-md border border-gray-200 px-2 py-1.5 font-mono text-xs"
              />

              <div class="rounded-md border border-gray-200 max-h-96 overflow-y-auto">
                <table class="min-w-full text-xs">
                  <thead class="bg-gray-50 sticky top-0">
                    <tr>
                      <th class="text-left px-2 py-1 font-medium text-gray-500 w-12">#</th>
                      <th class="text-left px-2 py-1 font-medium text-gray-500">EPC</th>
                      <th class="text-right px-2 py-1 font-medium text-gray-500 w-16">bytes</th>
                      <th class="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0
                      ? (
                        <tr>
                          <td colSpan={4} class="text-center text-gray-400 py-6">
                            {draft.length === 0 ? "No cards." : "No cards match search."}
                          </td>
                        </tr>
                      )
                      : filtered.map((c) => (
                        <tr key={c} class="border-t border-gray-100 hover:bg-gray-50">
                          <td class="px-2 py-1 text-gray-400">{draft.indexOf(c) + 1}</td>
                          <td class="px-2 py-1 font-mono text-gray-900">{c}</td>
                          <td class="px-2 py-1 text-right text-gray-500">{c.length / 2}</td>
                          <td>
                            <button
                              type="button"
                              onClick={() => setDraft(draft.filter((d) => d !== c))}
                              class="text-gray-400 hover:text-red-600 px-1"
                              aria-label="remove"
                              title="Remove"
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <DiffSummary diff={diff} />

              <div class="flex items-center gap-3 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  disabled={busy || !diff.dirty}
                  class="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {busy ? "Uploading..." : "Write to reader"}
                </button>
                <button
                  type="button"
                  onClick={() => current && setDraft(current)}
                  disabled={!diff.dirty || busy}
                  class="text-xs text-gray-500 hover:text-gray-900 underline disabled:opacity-50"
                >
                  Reset
                </button>
              </div>
            </>
          )}
      </div>

      {confirming && (
        <ConfirmReplace
          diff={diff}
          onConfirm={writeNow}
          onCancel={() => setConfirming(false)}
          busy={busy}
        />
      )}
    </div>
  );
}

interface Diff {
  added: string[];
  removed: string[];
  unchanged: number;
  dirty: boolean;
}

function computeDiff(before: string[], after: string[]): Diff {
  const beforeSet = new Set(before);
  const afterSet = new Set(after);
  const added = after.filter((c) => !beforeSet.has(c));
  const removed = before.filter((c) => !afterSet.has(c));
  return {
    added,
    removed,
    unchanged: before.length - removed.length,
    dirty: added.length > 0 || removed.length > 0,
  };
}

function DiffSummary({ diff }: { diff: Diff }) {
  if (!diff.dirty) {
    return <p class="text-xs text-gray-500">No pending changes.</p>;
  }
  return (
    <p class="text-xs">
      <span class="text-emerald-700">+{diff.added.length} added</span>
      {" · "}
      <span class="text-red-700">−{diff.removed.length} removed</span>
      {" · "}
      <span class="text-gray-500">{diff.unchanged} unchanged</span>
    </p>
  );
}

function ConfirmReplace(
  { diff, onConfirm, onCancel, busy }: {
    diff: Diff;
    onConfirm: () => void;
    onCancel: () => void;
    busy: boolean;
  },
) {
  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div class="w-full max-w-md rounded-xl bg-white p-5 shadow-xl space-y-3">
        <h3 class="text-lg font-bold text-gray-900">Replace whitelist?</h3>
        <p class="text-sm text-gray-700">
          This <strong>replaces all cards</strong> on the reader with the local list.
          The reader is briefly switched to response mode during the upload, then restored.
        </p>
        <div class="rounded-md border border-gray-200 bg-gray-50 p-3 text-xs space-y-1">
          <div class="text-emerald-700">+ {diff.added.length} added</div>
          <div class="text-red-700">− {diff.removed.length} removed</div>
          <div class="text-gray-600">= {diff.unchanged} unchanged</div>
        </div>
        {diff.added.length > 0 && (
          <details class="text-xs">
            <summary class="cursor-pointer text-gray-600">Added EPCs</summary>
            <ul class="mt-1 max-h-32 overflow-y-auto font-mono text-gray-800 space-y-0.5">
              {diff.added.slice(0, 50).map((c) => <li key={c}>+ {c}</li>)}
              {diff.added.length > 50 && <li class="text-gray-400">... +{diff.added.length - 50} more</li>}
            </ul>
          </details>
        )}
        {diff.removed.length > 0 && (
          <details class="text-xs">
            <summary class="cursor-pointer text-gray-600">Removed EPCs</summary>
            <ul class="mt-1 max-h-32 overflow-y-auto font-mono text-gray-800 space-y-0.5">
              {diff.removed.slice(0, 50).map((c) => <li key={c}>− {c}</li>)}
              {diff.removed.length > 50 && <li class="text-gray-400">... −{diff.removed.length - 50} more</li>}
            </ul>
          </details>
        )}
        <div class="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            class="rounded-md px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            class="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {busy ? "Writing..." : "Replace"}
          </button>
        </div>
      </div>
    </div>
  );
}

function parseCsvCards(text: string): { cards: string[]; errors: string[] } {
  const cards: string[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (!raw) continue;
    if (i === 0 && /^epc$/i.test(raw)) continue;
    const epc = raw.split(",")[0].trim().toUpperCase().replace(/[\s_-]/g, "");
    if (!epc) continue;
    if (epc.length === 0 || epc.length % 2 !== 0) {
      errors.push(`row ${i + 1}: odd hex length`);
      continue;
    }
    if (!HEX_RE.test(epc)) {
      errors.push(`row ${i + 1}: not hex`);
      continue;
    }
    if (epc.length / 2 > 31) {
      errors.push(`row ${i + 1}: > 31 bytes`);
      continue;
    }
    if (seen.has(epc)) continue;
    seen.add(epc);
    cards.push(epc);
  }
  return { cards, errors };
}

function NotPaired({ agentId }: { agentId: string }) {
  return (
    <div class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      This browser is not paired with agent <span class="font-mono">{agentId.substring(0, 8)}</span>.
      {" "}
      <a href="/live" class="underline font-semibold">Pair now →</a>
    </div>
  );
}

function describe(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return String(e);
}
