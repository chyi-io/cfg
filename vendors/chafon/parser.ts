import type { ParseResult } from "../../lib/types.ts";

/**
 * INI section names recognized as Chafon config sections.
 */
const CHAFON_SECTIONS = new Set(["Basic", "Antenna", "Advanced", "Remote"]);

/**
 * Parse a Chafon INI configuration file into a flat key-value map.
 *
 * Format: standard INI with [Section] headers and Key=Value pairs.
 * Section headers are stripped — keys are globally unique in Chafon configs.
 *
 * @param buffer - Raw file bytes.
 * @returns Parsed config or error.
 */
export const parseChafonConfig = async (
  buffer: Uint8Array,
): Promise<ParseResult> => {
  try {
    const content = new TextDecoder().decode(buffer);
    const lines = content.split(/\r?\n/);

    // Quick validation: must have at least one recognized section header
    const hasChafonSection = lines.some((l) => {
      const match = l.trim().match(/^\[(.+)\]$/);
      return match ? CHAFON_SECTIONS.has(match[1]) : false;
    });

    if (!hasChafonSection) {
      return { success: false, error: "Not a recognized Chafon INI config" };
    }

    const config: Record<string, string> = {};

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("[") || trimmed.startsWith("#") || trimmed.startsWith(";")) {
        continue;
      }
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const key = trimmed.substring(0, eqIdx);
        const value = trimmed.substring(eqIdx + 1);
        config[key] = value;
      }
    }

    if (Object.keys(config).length === 0) {
      return { success: false, error: "No parameters found in Chafon config" };
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
 * Section assignment for each known Chafon parameter key.
 * Used to reconstruct the INI file with correct [Section] headers.
 */
const KEY_SECTION: Record<string, string> = {
  Baud: "Basic", Power: "Basic", Addr: "Basic", Region: "Basic",
  StartFreq: "Basic", EndFreq: "Basic", IsPointFreq: "Basic",
  Workmode: "Basic", Port: "Basic", Area: "Basic", Startaddr: "Basic",
  DataLen: "Basic", Filtertime: "Basic", Triggletime: "Basic",
  Q: "Basic", Session: "Basic", WiegandMode: "Basic",
  WieggendOutMode: "Basic", "IntenelTime(*100mS)": "Basic", IsBuzzer: "Basic",

  Ant1: "Antenna", AntPower1: "Antenna", Ant2: "Antenna", AntPower2: "Antenna",
  Ant3: "Antenna", AntPower3: "Antenna", Ant4: "Antenna", AntPower4: "Antenna",

  PasswordEnable: "Advanced", PasswordHEX: "Advanced", MaskEnabled: "Advanced",
  StartAddr: "Advanced", MaskLen: "Advanced", MaskData: "Advanced",
  Condition: "Advanced", ConditionIndex: "Advanced", ProtocolEnable: "Advanced",
  ProrocolType: "Advanced", ProrocolTypeIndex: "Advanced", CacheEnable: "Advanced",

  IsEnable: "Remote", RemoteIP: "Remote", RemotePort: "Remote",
  HeartbeatTime: "Remote",
};

/**
 * Generate a Chafon INI configuration file from a flat config map.
 *
 * @param config - Flat key-value config map.
 * @returns INI file bytes.
 */
export const generateChafonConfig = async (
  config: Record<string, string>,
): Promise<Uint8Array> => {
  // Group keys by section
  const sections: Record<string, [string, string][]> = {
    Basic: [],
    Antenna: [],
    Advanced: [],
    Remote: [],
  };

  for (const [key, value] of Object.entries(config)) {
    const section = KEY_SECTION[key] ?? "Basic";
    if (!sections[section]) sections[section] = [];
    sections[section].push([key, value]);
  }

  const lines: string[] = [];
  const sectionOrder = ["Basic", "Antenna", "Advanced", "Remote"];

  for (const section of sectionOrder) {
    const entries = sections[section];
    if (!entries || entries.length === 0) continue;
    lines.push(`[${section}]`);
    for (const [key, value] of entries) {
      lines.push(`${key}=${value}`);
    }
  }

  lines.push("");
  return new TextEncoder().encode(lines.join("\n"));
};
