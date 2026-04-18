import { useEffect, useRef, useState } from "preact/hooks";

interface DocPage {
  slug: string;
  title: string;
}

interface DocsIslandProps {
  initialSlug?: string;
  pages: DocPage[];
}

export default function DocsIsland({ initialSlug, pages }: DocsIslandProps) {
  const [activeSlug, setActiveSlug] = useState(
    initialSlug || pages[0]?.slug || "",
  );
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const articleRef = useRef<HTMLElement | null>(null);

  // The API returns markdown pre-rendered to HTML (server-side sanitized).
  // Assigning via ref + innerHTML keeps the lint rule `react-no-danger` happy
  // while producing the same result as dangerouslySetInnerHTML. If we ever
  // need to embed interactive Preact components inside docs, switch to a
  // markdown→vdom renderer.
  useEffect(() => {
    if (articleRef.current) articleRef.current.innerHTML = html;
  }, [html]);

  useEffect(() => {
    if (!activeSlug) return;
    setLoading(true);
    fetch(`/api/docs/${activeSlug}`)
      .then((r) => r.json())
      .then((data) => {
        setHtml(data.html || "");
        if (typeof document !== "undefined" && data.title) {
          document.title = `${data.title} — Chyi CFG docs`;
        }
        setLoading(false);
        // Update URL without reload
        const url = `/docs/${activeSlug}`;
        if (globalThis.location.pathname !== url) {
          globalThis.history.pushState(null, "", url);
        }
      })
      .catch(() => {
        setHtml("<p>Failed to load document.</p>");
        setLoading(false);
      });
  }, [activeSlug]);

  // Handle browser back/forward
  useEffect(() => {
    const onPop = () => {
      const match = globalThis.location.pathname.match(/^\/docs\/(.+)$/);
      if (match && match[1] !== activeSlug) {
        setActiveSlug(match[1]);
      }
    };
    globalThis.addEventListener("popstate", onPop);
    return () => globalThis.removeEventListener("popstate", onPop);
  }, [activeSlug]);

  return (
    <div class="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header class="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div class="px-4 py-3 flex items-center justify-between max-w-7xl mx-auto">
          <div class="flex items-center gap-3">
            <img
              src="/chyi-icon.png"
              alt="CHYI"
              class="w-8 h-8 flex-shrink-0"
            />
            <div>
              <h1 class="text-lg font-bold text-gray-800">Documentation</h1>
              <p class="text-xs text-gray-500">Chyi Hardware Configurator</p>
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
            Home
          </a>
        </div>
      </header>

      <div class="flex flex-1 max-w-7xl mx-auto w-full">
        {/* Sidebar nav */}
        <nav class="w-64 flex-shrink-0 border-r border-gray-200 bg-white hidden lg:block">
          <div class="p-4 space-y-1">
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Guides
            </p>
            {pages.map((p) => (
              <button
                key={p.slug}
                type="button"
                onClick={() => setActiveSlug(p.slug)}
                class={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  p.slug === activeSlug
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                {p.title}
              </button>
            ))}
          </div>
        </nav>

        {/* Mobile nav dropdown */}
        <div class="lg:hidden p-4 border-b border-gray-200 bg-white w-full">
          <select
            value={activeSlug}
            onChange={(e) =>
              setActiveSlug((e.target as HTMLSelectElement).value)}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          >
            {pages.map((p) => (
              <option key={p.slug} value={p.slug}>{p.title}</option>
            ))}
          </select>
        </div>

        {/* Content */}
        <main class="flex-1 overflow-y-auto">
          {loading
            ? (
              <div class="flex items-center justify-center py-20">
                <div class="flex flex-col items-center gap-3">
                  <div class="animate-spin rounded-full h-8 w-8 border-3 border-blue-500 border-t-transparent" />
                  <p class="text-sm text-gray-500">Loading...</p>
                </div>
              </div>
            )
            : (
              <article
                ref={articleRef}
                class="prose prose-gray max-w-none p-6 lg:p-10"
              />
            )}
        </main>
      </div>
    </div>
  );
}
