import { define } from "../../utils.ts";
import PairForm from "../../islands/live/PairForm.tsx";
import InstallSnippet from "../../components/live/InstallSnippet.tsx";

function detectScheme(req: Request): "http" | "https" {
  const xfp = req.headers.get("x-forwarded-proto");
  if (xfp) {
    const first = xfp.split(",")[0].trim().toLowerCase();
    if (first === "https") return "https";
    if (first === "http") return "http";
  }
  try {
    const u = new URL(req.url);
    if (u.protocol === "https:") return "https";
    if (u.protocol === "http:") return "http";
  } catch {
    // ignore
  }
  return "https";
}

export default define.page((ctx) => {
  const host = ctx.req.headers.get("host") ?? "cfg.chyi.io";
  const scheme = detectScheme(ctx.req);
  return (
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div class="container mx-auto px-4 py-12 max-w-2xl">
        <div class="text-center mb-8">
          <h1 class="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
            Live Device Configuration
          </h1>
          <p class="text-gray-500">
            Connect to a real device on your local network through the
            chyi-cfg-agent.
          </p>
        </div>

        <div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm mb-6">
          <h2 class="text-lg font-bold text-gray-900 mb-3">
            Pair with a running agent
          </h2>
          <PairForm />
        </div>

        <div class="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-6 shadow-sm space-y-3">
          <div class="flex items-center gap-2">
            <span class="text-emerald-600">●</span>
            <h2 class="text-lg font-bold text-gray-900">
              First time? Install the agent
            </h2>
          </div>
          <p class="text-sm text-gray-700">
            cfg never reaches your device directly — a tiny Linux daemon called
            {" "}
            <strong>chyi-cfg-agent</strong>
            runs on the same network as the device, and proxies commands from
            this site to it. One operator installs it once; everyone else just
            visits this URL.
          </p>
          <InstallSnippet host={host} scheme={scheme} />
          <ol class="text-sm text-gray-700 list-decimal list-inside space-y-1">
            <li>Run that command on a Linux box that can reach the device.</li>
            <li>
              Wait for the agent to print a pair code (e.g.{" "}
              <code class="font-mono text-xs">ABCD-EFGH</code>).
            </li>
            <li>
              Enter the code above to bind your browser to that agent for 24
              hours.
            </li>
          </ol>
          <p class="text-xs text-gray-500">
            See{" "}
            <a href="/docs/agent" class="underline hover:text-blue-600">
              docs/agent
            </a>{" "}
            for requirements (glibc, x86_64-linux, libCFApi.so) and
            troubleshooting.
          </p>
        </div>

        <div class="mt-6 text-center text-xs text-gray-500">
          <a href="/" class="hover:text-blue-600 underline">
            ← Back to config editor
          </a>
        </div>
      </div>
    </div>
  );
});
