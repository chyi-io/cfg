import ConfigPageIsland from "../islands/ConfigPageIsland.tsx";

// Backward-compatible route: reads from sessionStorage.
// New flow uses /config/[vendor]/[device] instead.
export default function ConfigPage() {
  return <ConfigPageIsland />;
}
