import type { CategoryDef } from "../../lib/types.ts";

/**
 * Chafon UHF Reader parameter categories, matching INI sections.
 */
export const chafonCategories: readonly CategoryDef[] = [
  { id: "basic", label: "Basic", icon: "\u{2699}\u{FE0F}", color: "bg-blue-100 text-blue-700", order: 0 },
  { id: "antenna", label: "Antenna", icon: "\u{1F4E1}", color: "bg-green-100 text-green-700", order: 1 },
  { id: "advanced", label: "Advanced", icon: "\u{1F512}", color: "bg-amber-100 text-amber-700", order: 2 },
  { id: "remote", label: "Remote", icon: "\u{1F310}", color: "bg-purple-100 text-purple-700", order: 3 },
  { id: "other", label: "Other", icon: "\u{1F4C1}", color: "bg-stone-100 text-stone-700", order: 4 },
];

/**
 * Assign a category key to a Chafon parameter ID.
 * Chafon uses string-based keys, so numeric categorization is a no-op fallback.
 *
 * @param _paramId - Numeric parameter ID (unused for Chafon).
 * @returns Category key string.
 */
export const categorizeParam = (_paramId: number): string => "other";
