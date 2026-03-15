/**
 * Detect the Chafon device variant from a parsed config map.
 * Currently only M-Series is supported.
 *
 * @param _config - Flat key-value config map.
 * @returns Device ID string (currently always "m_series").
 */
export const detectChafonDevice = (
  _config: Record<string, string>,
): string => "m_series";
