import type { ParseResult } from "../../lib/types.ts";

/**
 * Parse a Ruptela configuration file into a flat key-value map.
 * 
 * Ruptela uses a proprietary binary format for device configuration.
 * This is a stub implementation that supports a simple text-based
 * key=value format (one per line) for development and testing.
 * 
 * TODO: Implement full binary protocol parsing when sample files are available.
 *
 * @param buffer - Raw file bytes.
 * @returns Parsed config or error.
 */
export const parseRuptelaConfig = async (
  buffer: Uint8Array,
): Promise<ParseResult> => {
  try {
    const content = new TextDecoder().decode(buffer);

    // Detect if this looks like a Ruptela text config (key=value lines)
    const lines = content.split("\n").filter((l) => l.trim() && !l.startsWith("#"));
    if (lines.length === 0) {
      return { success: false, error: "Empty or unrecognized file" };
    }

    // Check for header marker
    const hasHeader = lines[0].trim().startsWith("[RUPTELA") ||
      lines[0].trim().startsWith("RUPTELA");

    if (!hasHeader && !lines[0].includes("=")) {
      return { success: false, error: "Not a recognized Ruptela config format" };
    }

    const config: Record<string, string> = {};
    for (const line of lines) {
      if (line.startsWith("[") || line.startsWith("RUPTELA")) continue;
      const eqIdx = line.indexOf("=");
      if (eqIdx > 0) {
        const key = line.substring(0, eqIdx).trim();
        const value = line.substring(eqIdx + 1).trim();
        config[key] = value;
      }
    }

    if (Object.keys(config).length === 0) {
      return { success: false, error: "No parameters found in file" };
    }

    return { success: true, config };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown parse error",
    };
  }
};

/**
 * Generate a Ruptela configuration file from a flat config map.
 * 
 * Stub implementation: outputs a text-based key=value format with header.
 * TODO: Implement full binary format when protocol spec is available.
 *
 * @param config - Flat key-value config map.
 * @returns File bytes.
 */
export const generateRuptelaConfig = async (
  config: Record<string, string>,
): Promise<Uint8Array> => {
  const lines = ["[RUPTELA ECO5]"];
  const sortedKeys = Object.keys(config).sort(
    (a, b) => parseInt(a) - parseInt(b),
  );
  for (const key of sortedKeys) {
    lines.push(`${key}=${config[key]}`);
  }
  lines.push("");
  return new TextEncoder().encode(lines.join("\n"));
};
