import type { CategoryDef, ParamMeta } from "./types.ts";
import ParamField from "./ParamField.tsx";

interface CategoryPanelProps {
  category: CategoryDef;
  filteredParams: string[];
  searchQuery: string;
  config: Record<string, string>;
  validationErrors: Record<string, string>;
  getMeta: (id: string) => ParamMeta;
  onValueChange: (id: string, val: string) => void;
}

const CategoryPanel = ({
  category,
  filteredParams,
  searchQuery,
  config,
  validationErrors,
  getMeta,
  onValueChange,
}: CategoryPanelProps) => (
  <div>
    <div class="flex items-center gap-3 mb-5">
      <span class="text-2xl">{category.icon}</span>
      <div>
        <h2 class="text-xl font-bold text-gray-800">{category.label}</h2>
        <p class="text-xs text-gray-500">
          {filteredParams.length}{" "}
          parameter{filteredParams.length !== 1 ? "s" : ""}
          {category.deviceOnly && (
            <span class="ml-1 px-1.5 py-0.5 rounded bg-red-50 text-red-600 text-[10px] font-bold uppercase">
              {category.deviceOnly} only
            </span>
          )}
        </p>
      </div>
    </div>

    {filteredParams.length === 0
      ? (
        <p class="text-sm text-gray-400 italic">
          {searchQuery
            ? "No parameters match your search."
            : "No parameters in this category."}
        </p>
      )
      : (
        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          {filteredParams.map((paramId) => (
            <ParamField
              key={paramId}
              paramId={paramId}
              meta={getMeta(paramId)}
              value={config[paramId] ?? ""}
              error={validationErrors[paramId]}
              onValueChange={onValueChange}
            />
          ))}
        </div>
      )}
  </div>
);

export default CategoryPanel;
