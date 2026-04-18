// Dev cloud entry — runs the same app as production but via Deno.serve so
// WebSocket upgrades reach our Fresh routes (Vite dev middleware doesn't proxy
// WS upgrades). Use `deno task dev` for SPA-only HMR work; this is for
// integration testing the live-device flow.

import { app } from "../main.ts";

const port = Number.parseInt(Deno.env.get("CFG_DEV_PORT") ?? "8000", 10);
Deno.serve({ port }, app.handler());
