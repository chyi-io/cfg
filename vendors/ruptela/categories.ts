import type { CategoryDef } from "../../lib/types.ts";

/**
 * Ruptela ECO5 parameter categories, ordered for sidebar display.
 */
export const ruptelaCategories: readonly CategoryDef[] = [
  {
    id: "connectivity",
    label: "Connectivity",
    icon: "\u{1F310}",
    color: "bg-blue-100 text-blue-700",
    order: 0,
  },
  {
    id: "tracking",
    label: "Tracking",
    icon: "\u{1F4E1}",
    color: "bg-amber-100 text-amber-700",
    order: 1,
  },
  {
    id: "io",
    label: "I/O",
    icon: "\u{1F50C}",
    color: "bg-teal-100 text-teal-700",
    order: 2,
  },
  {
    id: "geofence",
    label: "Geofence",
    icon: "\u{1F4CD}",
    color: "bg-indigo-100 text-indigo-700",
    order: 3,
  },
  {
    id: "system",
    label: "System",
    icon: "\u{1F4BB}",
    color: "bg-slate-100 text-slate-700",
    order: 4,
  },
  {
    id: "other",
    label: "Other",
    icon: "\u{1F4C1}",
    color: "bg-stone-100 text-stone-700",
    order: 5,
  },
];

/**
 * Assign a category key to a Ruptela parameter ID.
 * Ruptela uses a different ID namespace than Teltonika.
 *
 * @param paramId - Numeric parameter ID.
 * @returns Category key string.
 */
export const categorizeParam = (paramId: number): string => {
  if (paramId >= 100 && paramId <= 199) return "connectivity";
  if (paramId >= 200 && paramId <= 299) return "tracking";
  if (paramId >= 300 && paramId <= 399) return "io";
  if (paramId >= 400 && paramId <= 499) return "geofence";
  if (paramId >= 1 && paramId <= 99) return "system";
  return "other";
};
