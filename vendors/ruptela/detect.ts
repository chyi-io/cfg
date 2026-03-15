/**
 * Detect the Ruptela device variant from a parsed config map.
 * Currently only ECO5 is supported.
 *
 * @param config - Flat key-value config map.
 * @returns Device ID string (currently always "eco5").
 */
export const detectRuptelaDevice = (
  config: Record<string, string>,
): string => {
  // Future: inspect config values to distinguish between
  // ECO5, FM-Eco4, HCV5, Pro5, etc.
  const _config = config;
  return "eco5";
};
