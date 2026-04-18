import { useState } from "preact/hooks";
import { storeToken } from "./useAgentSocket.ts";

export default function PairForm() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: Event) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const res = await fetch("/api/live/pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        setErr(body.error ?? "pair failed");
        setBusy(false);
        return;
      }
      const body = await res.json() as { token: string; exp: number; agentId: string };
      storeToken(body);
      location.href = `/live/${body.agentId}`;
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} class="space-y-3">
      <label class="block text-sm font-medium text-gray-700">
        Pair code
        <input
          type="text"
          value={code}
          onInput={(e) => setCode((e.target as HTMLInputElement).value.toUpperCase())}
          placeholder="ABCD-EFGH"
          autoComplete="off"
          autoCapitalize="characters"
          spellcheck={false}
          class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-mono tracking-wider text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          maxLength={9}
        />
      </label>
      {err && (
        <div class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      )}
      <button
        type="submit"
        disabled={busy || code.length < 8}
        class="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {busy ? "Pairing..." : "Pair"}
      </button>
      <p class="text-xs text-gray-500">
        The agent prints this code on startup. Codes expire 10 minutes after issuance.
      </p>
    </form>
  );
}
