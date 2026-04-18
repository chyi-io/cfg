import type { Capability } from "../../shared/capabilities.ts";

interface Props {
  agentId: string;
  active: "info" | "work_mode" | "remote_server" | "whitelist";
  /** Capabilities of the currently-connected device. If empty, only Device-info shows. */
  capabilities?: Capability[];
}

interface Item {
  key: Props["active"];
  label: string;
  path: string;
  /** undefined → always shown; otherwise the capability that gates this tab. */
  cap?: Capability;
}

const ITEMS: Item[] = [
  { key: "info", label: "Device info", path: "" },
  {
    key: "work_mode",
    label: "Work mode",
    path: "/work_mode",
    cap: "work_mode",
  },
  {
    key: "remote_server",
    label: "Remote server",
    path: "/remote_server",
    cap: "remote_server",
  },
  {
    key: "whitelist",
    label: "Whitelist",
    path: "/whitelist",
    cap: "whitelist",
  },
];

export default function FeatureNav({ agentId, active, capabilities }: Props) {
  // If capabilities are unknown (we're not connected yet), show all items so the
  // user sees the navigation shape; clicking gated items will surface a clear
  // "open the connection first" message on the target page.
  const caps = capabilities ?? [];
  const knowsCaps = capabilities !== undefined && capabilities.length > 0;
  const items = ITEMS.filter((i) =>
    !i.cap || !knowsCaps || caps.includes(i.cap)
  );

  return (
    <nav class="flex flex-wrap gap-1 rounded-lg bg-white border border-gray-200 p-1 shadow-sm">
      {items.map((item) => {
        const href = `/live/${agentId}${item.path}`;
        const cls = active === item.key
          ? "bg-blue-600 text-white"
          : "text-gray-700 hover:bg-gray-100";
        return (
          <a
            key={item.key}
            href={href}
            class={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${cls}`}
          >
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}
