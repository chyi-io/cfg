import { type ZodType } from "zod";

// ─── Parameter Option ────────────────────────────────────────────────

/**
 * A single selectable value for an enum/dropdown parameter.
 *
 * @example
 * ```ts
 * const opt: ParamOption = { value: "0", label: "Disabled" };
 * ```
 */
export interface ParamOption {
  /** The raw value stored in the config file. */
  readonly value: string;
  /** Human-readable label shown in the UI. */
  readonly label: string;
}

// ─── Parameter Schema ────────────────────────────────────────────────

/**
 * Describes a single configuration parameter with its validation schema,
 * display metadata, and category assignment.
 *
 * @example
 * ```ts
 * import { z } from "zod";
 * const param: ParamSchema = {
 *   id: "2004",
 *   name: "Server Domain",
 *   description: "Primary server hostname or IP",
 *   category: "gprs_server",
 *   zodSchema: z.string().min(1),
 *   hint: "e.g. connect.example.io",
 * };
 * ```
 */
export interface ParamSchema {
  /** Unique parameter ID (usually numeric string like "2004"). */
  readonly id: string;
  /** Human-readable parameter name. */
  readonly name: string;
  /** Longer description shown as helper text. */
  readonly description: string;
  /** Category key this parameter belongs to. */
  readonly category: string;
  /** Zod schema used for validation. */
  readonly zodSchema: ZodType;
  /** Placeholder / hint text for the input field. */
  readonly hint?: string;
  /** Enum options — when present, renders a dropdown. */
  readonly options?: readonly ParamOption[];
  /** Minimum numeric value (extracted for UI display). */
  readonly min?: number;
  /** Maximum numeric value (extracted for UI display). */
  readonly max?: number;
}

// ─── Category Definition ─────────────────────────────────────────────

/**
 * Defines a parameter category (section) in the editor UI.
 *
 * @example
 * ```ts
 * const cat: CategoryDef = {
 *   id: "gprs_server",
 *   label: "GPRS / Server",
 *   icon: "\u{1F310}",
 *   color: "bg-blue-100 text-blue-700",
 *   order: 2,
 * };
 * ```
 */
export interface CategoryDef {
  /** Unique category identifier. */
  readonly id: string;
  /** Display label. */
  readonly label: string;
  /** Emoji or icon string. */
  readonly icon: string;
  /** Tailwind CSS color classes for badges. */
  readonly color: string;
  /** Sort order (lower = first). */
  readonly order: number;
  /** If true, only shown for specific device variants. */
  readonly deviceOnly?: string;
}

// ─── Device Definition ───────────────────────────────────────────────

/**
 * Fully describes a device variant within a vendor, including its
 * categories, parameter schemas, and default values.
 *
 * @example
 * ```ts
 * const fmb: DeviceDefinition = {
 *   id: "fmb",
 *   name: "Teltonika FMB Series",
 *   vendorId: "teltonika",
 *   categories: [systemCat, gprsCat],
 *   paramSchemas: { "2004": serverDomainSchema },
 *   defaults: { "2004": "connect.example.io" },
 * };
 * ```
 */
export interface DeviceDefinition {
  /** Unique device identifier within the vendor (e.g. "fmb", "eco5"). */
  readonly id: string;
  /** Human-readable device name. */
  readonly name: string;
  /** Parent vendor ID. */
  readonly vendorId: string;
  /** Ordered list of parameter categories for this device. */
  readonly categories: readonly CategoryDef[];
  /** Map of paramId → ParamSchema for every known parameter. */
  readonly paramSchemas: Record<string, ParamSchema>;
  /** Default config values for a "Create New" flow. */
  readonly defaults: Record<string, string>;
}

// ─── Parse / Generate Results ────────────────────────────────────────

/**
 * Result of parsing a raw config file buffer.
 */
export interface ParseResult {
  readonly success: boolean;
  /** Flat key-value config map (paramId → value). */
  readonly config?: Record<string, string>;
  readonly error?: string;
}

/**
 * Result of validating a single parameter value.
 */
export interface ValidationResult {
  readonly valid: boolean;
  readonly error?: string;
}

/**
 * Structured config grouped by category key.
 */
export type StructuredConfig = Record<string, Record<string, string>>;

// ─── Vendor Plugin ───────────────────────────────────────────────────

/**
 * Contract that every vendor library must implement.
 * The registry uses this interface to auto-detect files and
 * dispatch parsing/generation to the correct vendor.
 *
 * @example
 * ```ts
 * const teltonika: VendorPlugin = {
 *   id: "teltonika",
 *   name: "Teltonika",
 *   fileExtensions: [".cfg"],
 *   devices: [fmbDef, fmcDef],
 *   parse: (buf) => parseCfgFile(buf),
 *   generate: (config) => generateCfgFile(config),
 *   detectDevice: (config) => detectDeviceFamily(config),
 *   categorizeParam: (id) => categorizeParam(id),
 *   getParamSchema: (deviceId, paramId) => lookupSchema(deviceId, paramId),
 * };
 * ```
 */
export interface VendorPlugin {
  /** Unique vendor identifier (e.g. "teltonika", "ruptela"). */
  readonly id: string;
  /** Human-readable vendor name. */
  readonly name: string;
  /** File extensions this vendor handles (e.g. [".cfg"]). */
  readonly fileExtensions: readonly string[];
  /** All device definitions this vendor supports. */
  readonly devices: readonly DeviceDefinition[];

  /**
   * Parse a raw file buffer into a flat config map.
   * @param buffer - Raw file bytes (may be compressed).
   * @returns Parsed config or error.
   */
  readonly parse: (buffer: Uint8Array) => Promise<ParseResult>;

  /**
   * Generate a downloadable file buffer from a config map.
   * @param config - Flat key-value config map.
   * @returns Compressed/encoded file bytes.
   */
  readonly generate: (config: Record<string, string>) => Promise<Uint8Array>;

  /**
   * Detect which device variant a parsed config belongs to.
   * @param config - Flat key-value config map.
   * @returns Device ID string (e.g. "fmb", "fmc", "eco5").
   */
  readonly detectDevice: (config: Record<string, string>) => string;

  /**
   * Assign a category key to a numeric parameter ID.
   * @param paramId - Numeric parameter ID.
   * @returns Category key string.
   */
  readonly categorizeParam: (paramId: number) => string;

  /**
   * Look up the ParamSchema for a given device and parameter.
   * Returns a fallback schema if the param is not explicitly defined.
   * @param deviceId - Device variant ID.
   * @param paramId - Parameter ID string.
   * @returns ParamSchema for the parameter.
   */
  readonly getParamSchema: (deviceId: string, paramId: string) => ParamSchema;
}

/**
 * Data returned by the API after a successful upload or "create new".
 * Consumed by the config editor island.
 */
export interface ConfigPayload {
  readonly vendorId: string;
  readonly deviceId: string;
  readonly config: Record<string, string>;
  readonly structured: StructuredConfig;
  readonly categories: readonly CategoryDef[];
  /** Serialisable param metadata (Zod schemas are NOT serialised). */
  readonly paramMetas: Record<string, SerializedParamMeta>;
}

/**
 * JSON-safe subset of ParamSchema sent to the client island.
 * Zod schemas stay on the server; the client uses these for UI hints.
 */
export interface SerializedParamMeta {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly type: "string" | "number";
  readonly hint?: string;
  readonly options?: readonly ParamOption[];
  readonly min?: number;
  readonly max?: number;
  /** Whether this parameter is compatible with the selected device. */
  readonly compatible: boolean;
}
