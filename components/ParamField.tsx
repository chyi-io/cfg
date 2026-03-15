import type { ParamMeta } from "./types.ts";

interface ParamFieldProps {
  paramId: string;
  meta: ParamMeta;
  value: string;
  error?: string;
  onValueChange: (id: string, val: string) => void;
}

const ParamField = ({ paramId, meta, value, error, onValueChange }: ParamFieldProps) => {
  const hasOptions = meta.options && meta.options.length > 0;
  const disabled = !meta.compatible;
  const borderClass = disabled
    ? "border-gray-100 bg-gray-100 text-gray-400 cursor-not-allowed"
    : error
      ? "border-red-300 focus:ring-red-500"
      : "border-gray-200 focus:ring-blue-500";

  return (
    <div class={`group ${disabled ? "opacity-60" : ""}`}>
      <label class="flex items-baseline gap-2 mb-1.5">
        <span class={`text-sm font-medium ${disabled ? "text-gray-400" : "text-gray-700"}`}>{meta.name}</span>
        <span class="text-[11px] text-gray-400 font-mono">#{paramId}</span>
        {disabled && (
          <span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 font-semibold uppercase">
            incompatible
          </span>
        )}
      </label>

      {hasOptions ? (
        <select
          value={value}
          disabled={disabled}
          onChange={(e) => onValueChange(paramId, (e.target as HTMLSelectElement).value)}
          class={`w-full ${borderClass} border rounded-lg px-3 py-2 text-sm ${disabled ? "" : "bg-gray-50 focus:bg-white"} focus:outline-none focus:ring-2 focus:border-transparent transition-colors`}
        >
          {!meta.options!.some((o) => o.value === value) && (
            <option value={value}>
              {value ? `Custom: ${value}` : "\u2014 select \u2014"}
            </option>
          )}
          {meta.options!.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label} ({opt.value})
            </option>
          ))}
        </select>
      ) : (
        <input
          type={meta.type === "number" ? "number" : "text"}
          value={value}
          disabled={disabled}
          onInput={(e) => onValueChange(paramId, (e.target as HTMLInputElement).value)}
          class={`w-full ${borderClass} border rounded-lg px-3 py-2 text-sm ${disabled ? "" : "bg-gray-50 focus:bg-white"} focus:outline-none focus:ring-2 focus:border-transparent transition-colors`}
          placeholder={meta.hint || meta.description}
          min={meta.min}
          max={meta.max}
        />
      )}

      {error && (
        <p class="text-[11px] text-red-500 mt-1 leading-tight font-medium">{error}</p>
      )}
      <p class="text-[11px] text-gray-400 mt-0.5 leading-tight">
        {meta.description}
        {meta.hint && !hasOptions && (
          <span class="text-gray-500 ml-1">({meta.hint})</span>
        )}
        {meta.min !== undefined && meta.max !== undefined && (
          <span class="text-gray-500 ml-1">[{meta.min}\u2013{meta.max}]</span>
        )}
      </p>
    </div>
  );
};

export default ParamField;
