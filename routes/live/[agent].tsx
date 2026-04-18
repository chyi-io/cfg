import { define } from "../../utils.ts";
import AgentDashboard from "../../islands/live/AgentDashboard.tsx";

export default define.page((ctx) => {
  const agentId = ctx.params.agent;
  return (
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div class="container mx-auto px-4 py-10 max-w-2xl">
        <div class="flex items-center justify-between mb-6">
          <h1 class="text-2xl font-bold text-gray-900">Live Device</h1>
          <a
            href="/live"
            class="text-sm text-gray-500 hover:text-blue-600 underline"
          >
            Pair another agent
          </a>
        </div>
        <AgentDashboard agentId={agentId} />
      </div>
    </div>
  );
});
