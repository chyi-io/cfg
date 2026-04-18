import type { ConnectionState } from "./useAgentSocket.ts";

interface Props {
  state: ConnectionState;
  agentConnected: boolean;
  agentId: string;
}

export default function AgentStatusBanner(
  { state, agentConnected, agentId }: Props,
) {
  const { label, color } = describe(state, agentConnected);
  const shortId = agentId.substring(0, 8);

  return (
    <div class="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm">
      <span class={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />
      <span class="font-medium text-gray-800">{label}</span>
      <span class="ml-auto font-mono text-xs text-gray-400">
        agent {shortId}
      </span>
    </div>
  );
}

function describe(
  state: ConnectionState,
  agentConnected: boolean,
): { label: string; color: string } {
  if (state === "open" && agentConnected) {
    return { label: "Connected", color: "bg-emerald-500" };
  }
  if (state === "open") {
    return { label: "Paired, agent offline", color: "bg-yellow-500" };
  }
  if (state === "connecting") {
    return { label: "Connecting...", color: "bg-blue-500 animate-pulse" };
  }
  if (state === "closed") return { label: "Disconnected", color: "bg-red-500" };
  return { label: "Idle", color: "bg-gray-400" };
}
