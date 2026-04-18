import { define } from "../../../utils.ts";
import WorkModeEditor from "../../../islands/live/WorkModeEditor.tsx";

export default define.page((ctx) => {
  const agentId = ctx.params.agent;
  return (
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div class="container mx-auto px-4 py-10 max-w-2xl space-y-4">
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold text-gray-900">Live Device</h1>
          <a
            href={`/live/${agentId}`}
            class="text-sm text-gray-500 hover:text-blue-600 underline"
          >
            ← Dashboard
          </a>
        </div>
        <WorkModeEditor agentId={agentId} />
      </div>
    </div>
  );
});
