import type { CategoryDef, ParamMeta } from "./types.ts";

interface SidebarProps {
  categories: CategoryDef[];
  structured: Record<string, Record<string, string>>;
  activeCategory: string;
  searchQuery: string;
  validationErrors: Record<string, string>;
  sidebarOpen: boolean;
  getMeta: (id: string) => ParamMeta;
  onCategorySelect: (catId: string) => void;
  onSearchChange: (query: string) => void;
  onClose: () => void;
}

const Sidebar = ({
  categories,
  structured,
  activeCategory,
  searchQuery,
  validationErrors,
  sidebarOpen,
  getMeta,
  onCategorySelect,
  onSearchChange,
  onClose,
}: SidebarProps) => {
  const errorsByCategory = (catId: string): number => {
    const params = structured[catId] ?? {};
    return Object.keys(params).filter((id) => validationErrors[id]).length;
  };

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          class="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        class={`
          fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-40 pt-[57px]
          transform transition-transform duration-200 ease-in-out
          lg:static lg:translate-x-0 lg:pt-0 lg:h-auto lg:flex-shrink-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div class="flex flex-col h-full">
          {/* Search */}
          <div class="p-3 border-b border-gray-100">
            <input
              type="text"
              placeholder="Search parameters..."
              value={searchQuery}
              onInput={(e) =>
                onSearchChange((e.target as HTMLInputElement).value)}
              class="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category list */}
          <nav class="flex-1 overflow-y-auto py-2">
            {categories.map((cat) => {
              const catParams = Object.keys(structured[cat.id] ?? {});
              const paramCount = catParams.length;
              const incompatCount = catParams.filter((id) =>
                !getMeta(id).compatible
              ).length;
              const errCount = errorsByCategory(cat.id);
              const isActive = activeCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onCategorySelect(cat.id)}
                  class={`w-full text-left px-3 py-2.5 flex items-center gap-2.5 text-sm transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-700 border-r-2 border-blue-600"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span class="text-base flex-shrink-0">{cat.icon}</span>
                  <span class="flex-1 truncate font-medium">{cat.label}</span>
                  <span
                    class={`text-[10px] px-1.5 py-0.5 rounded-full ${cat.color}`}
                  >
                    {paramCount}
                  </span>
                  {incompatCount > 0 && incompatCount === paramCount && (
                    <span
                      class="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 font-bold"
                      title="All params incompatible with this device"
                    >
                      N/A
                    </span>
                  )}
                  {errCount > 0 && (
                    <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-bold">
                      {errCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
