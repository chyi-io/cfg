import { useCallback, useMemo, useState } from "preact/hooks";
import type { CategoryDef, ParamMeta } from "../components/types.ts";
import Sidebar from "../components/Sidebar.tsx";
import CategoryPanel from "../components/CategoryPanel.tsx";
import MessageBanner from "../components/MessageBanner.tsx";
import BottomBar from "../components/BottomBar.tsx";

interface ConfigEditorProps {
  vendorId: string;
  deviceId: string;
  initialConfig: Record<string, string>;
  structured: Record<string, Record<string, string>>;
  categories: CategoryDef[];
  paramMetas: Record<string, ParamMeta>;
}

// ── Main ConfigEditor with sidebar ───────────────────────────────────

export default function ConfigEditor({
  vendorId,
  deviceId,
  initialConfig,
  structured,
  categories,
  paramMetas,
}: ConfigEditorProps) {
  const [config, setConfig] = useState(initialConfig);
  const [activeCategory, setActiveCategory] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");
  const [downloading, setDownloading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [searchQuery, setSearchQuery] = useState("");

  // Build ordered list of categories that have params
  const sortedCategories = useMemo(
    () =>
      [...categories]
        .filter((c) =>
          structured[c.id] && Object.keys(structured[c.id]).length > 0
        )
        .sort((a, b) => a.order - b.order),
    [categories, structured],
  );

  // Set initial active category
  if (!activeCategory && sortedCategories.length > 0) {
    const first = sortedCategories[0].id;
    if (activeCategory !== first) {
      setTimeout(() => setActiveCategory(first), 0);
    }
  }

  const getMeta = useCallback(
    (paramId: string): ParamMeta =>
      paramMetas[paramId] ?? {
        id: paramId,
        name: `Param #${paramId}`,
        description: `Parameter ${paramId}`,
        category: "other",
        type: "string" as const,
        compatible: true,
      },
    [paramMetas],
  );

  const validateValue = (
    paramId: string,
    value: string,
  ): string | undefined => {
    if (value === "") return undefined;
    const meta = getMeta(paramId);
    if (meta.options && meta.options.length > 0) {
      const allowed = meta.options.map((o) => o.value);
      if (!allowed.includes(value)) {
        return `Accepted: ${
          meta.options.map((o) => `${o.value} (${o.label})`).join(", ")
        }`;
      }
    }
    if (meta.type === "number") {
      const num = parseFloat(value);
      if (isNaN(num)) return "Must be a number";
      if (meta.min !== undefined && num < meta.min) return `Min: ${meta.min}`;
      if (meta.max !== undefined && num > meta.max) return `Max: ${meta.max}`;
    }
    return undefined;
  };

  const handleValueChange = useCallback((paramId: string, value: string) => {
    const meta = getMeta(paramId);
    if (!meta.compatible) return;
    setConfig((prev) => ({ ...prev, [paramId]: value }));
    const error = validateValue(paramId, value);
    setValidationErrors((prev) => {
      const next = { ...prev };
      if (error) next[paramId] = error;
      else delete next[paramId];
      return next;
    });
  }, [getMeta, validateValue]);

  const handleDownload = async () => {
    setMessage("");
    setMessageType("");
    setDownloading(true);

    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId,
          deviceId,
          config: Object.fromEntries(
            Object.entries(config).filter(([id]) => getMeta(id).compatible),
          ),
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        setMessage(err.error || "Failed to generate configuration");
        setMessageType("error");
        setDownloading(false);
        return;
      }

      const blob = await response.blob();
      const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${ts}_${deviceId}_config`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage("Configuration downloaded successfully!");
      setMessageType("success");
    } catch (_error) {
      setMessage("Failed to download configuration");
      setMessageType("error");
    } finally {
      setDownloading(false);
    }
  };

  const totalParams = Object.keys(config).length;
  const compatibleParams = useMemo(
    () => Object.keys(config).filter((id) => getMeta(id).compatible).length,
    [config, getMeta],
  );
  const incompatibleParams = totalParams - compatibleParams;
  const totalErrors = Object.keys(validationErrors).length;

  // Filter params by search query
  const getFilteredParams = useCallback((catId: string): string[] => {
    const params = Object.keys(structured[catId] ?? {}).sort((a, b) => {
      const na = parseInt(a), nb = parseInt(b);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });
    if (!searchQuery) return params;
    const q = searchQuery.toLowerCase();
    return params.filter((id) => {
      const meta = getMeta(id);
      return (
        id.includes(q) ||
        meta.name.toLowerCase().includes(q) ||
        meta.description.toLowerCase().includes(q)
      );
    });
  }, [structured, searchQuery, getMeta]);

  const deviceLabel = deviceId.toUpperCase();
  const vendorLabel = vendorId.charAt(0).toUpperCase() + vendorId.slice(1);

  return (
    <div class="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header class="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div class="px-4 py-3 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen((p) => !p)}
              class="lg:hidden p-1.5 rounded-lg hover:bg-gray-100"
            >
              <svg
                class="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <img
              src="/chyi-icon.png"
              alt="CHYI"
              class="w-8 h-8 flex-shrink-0"
            />
            <div>
              <h1 class="text-lg font-bold text-gray-800">
                Chyi Hardware Configurator
              </h1>
              <p class="text-xs text-gray-500">
                {vendorLabel} {deviceLabel} &middot; {totalParams} parameters
              </p>
            </div>
          </div>
          <a
            href="/"
            class="text-sm text-gray-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back
          </a>
        </div>
      </header>

      <MessageBanner
        message={message}
        messageType={messageType}
        onDismiss={() => setMessage("")}
      />

      {/* Main layout: sidebar + content */}
      <div class="flex flex-1 overflow-hidden relative">
        <Sidebar
          categories={sortedCategories}
          structured={structured}
          activeCategory={activeCategory}
          searchQuery={searchQuery}
          validationErrors={validationErrors}
          sidebarOpen={sidebarOpen}
          getMeta={getMeta}
          onCategorySelect={(catId) => {
            setActiveCategory(catId);
            setSidebarOpen(false);
          }}
          onSearchChange={setSearchQuery}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Content area */}
        <main class="flex-1 overflow-y-auto pb-20">
          <div class="p-4 lg:p-6 max-w-4xl">
            {sortedCategories
              .filter((c) => c.id === activeCategory)
              .map((cat) => (
                <CategoryPanel
                  key={cat.id}
                  category={cat}
                  filteredParams={getFilteredParams(cat.id)}
                  searchQuery={searchQuery}
                  config={config}
                  validationErrors={validationErrors}
                  getMeta={getMeta}
                  onValueChange={handleValueChange}
                />
              ))}
          </div>
        </main>
      </div>

      <BottomBar
        vendorLabel={vendorLabel}
        deviceLabel={deviceLabel}
        compatibleParams={compatibleParams}
        incompatibleParams={incompatibleParams}
        totalErrors={totalErrors}
        downloading={downloading}
        onDownload={handleDownload}
      />
    </div>
  );
}
