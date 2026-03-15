/**
 * Detect the Teltonika device family from a parsed config map.
 * Uses the device name (param 801) and parameter count as heuristics.
 *
 * @param config - Flat key-value config map.
 * @returns `"fmb"`, `"fmc"`, or `"unknown"`.
 *
 * @example
 * ```ts
 * const family = detectDeviceFamily(config);
 * // "fmb" | "fmc" | "unknown"
 * ```
 */
export const detectDeviceFamily = (
  config: Record<string, string>,
): string => {
  const name = (config["801"] || "").toUpperCase();
  if (name.includes("FMC")) return "fmc";

  const paramCount = Object.keys(config).length;
  if (paramCount > 5000) return "fmc";

  if (
    name.includes("FMB") || name.includes("TMTGPS") || name.includes("TMT")
  ) {
    return "fmb";
  }
  if (paramCount < 4000) return "fmb";

  return "unknown";
};
