import { defineConfig } from "vite";
import { fresh } from "@fresh/plugin-vite";
import tailwindcss from "@tailwindcss/vite";

// Vite (port 5173 by default) serves the SPA with HMR. WebSocket endpoints
// (/api/agent/ws, /api/live/ws) DON'T work through Vite — its dev middleware
// pipeline swallows the path before any WS-upgrade proxy can match. For
// end-to-end testing (live device flow, agent pairing, install.sh), use the
// cloud directly on port 8001 (`deno task dev` runs both).
//
// `routes/install.sh.ts` detects requests on the Vite port and rewrites the
// embedded URLs to the cloud port — installing from either port works.
export default defineConfig({
  plugins: [fresh(), tailwindcss()],
});
