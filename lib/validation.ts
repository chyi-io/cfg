import { type ZodType, type ZodNumber, type ZodEnum, type ZodString, ZodFirstPartyTypeKind } from "zod";
import type {
  ParamSchema,
  ValidationResult,
  SerializedParamMeta,
  VendorPlugin,
  DeviceDefinition,
} from "./types.ts";
import { getAllVendorParamIds } from "./registry.ts";

/**
 * Validate a single parameter value against its Zod schema.
 * Empty strings are treated as valid (user hasn't filled the field yet).
 *
 * @param schema - The ParamSchema containing the Zod validator.
 * @param value - Raw string value from the config.
 * @returns Validation result with optional error message.
 *
 * @example
 * ```ts
 * const result = validateParam(serverPortSchema, "5555");
 * if (!result.valid) console.error(result.error);
 * ```
 */
export const validateParam = (
  schema: ParamSchema,
  value: string,
): ValidationResult => {
  if (value === "") return { valid: true };

  const parsed = schema.zodSchema.safeParse(value);
  if (parsed.success) return { valid: true };

  const firstIssue = parsed.error.issues[0];
  return { valid: false, error: firstIssue?.message ?? "Invalid value" };
};

/**
 * Validate an entire config map against a device definition.
 * Returns a record of paramId → error message for invalid params only.
 *
 * @param vendor - The vendor plugin.
 * @param deviceDef - The device definition with param schemas.
 * @param config - Flat key-value config map.
 * @returns Map of paramId → error string (empty if all valid).
 *
 * @example
 * ```ts
 * const errors = validateConfig(teltonika, fmbDef, config);
 * if (Object.keys(errors).length > 0) { ... }
 * ```
 */
export const validateConfig = (
  vendor: VendorPlugin,
  deviceDef: DeviceDefinition,
  config: Record<string, string>,
): Record<string, string> => {
  const errors: Record<string, string> = {};

  for (const [paramId, value] of Object.entries(config)) {
    const schema = vendor.getParamSchema(deviceDef.id, paramId);
    const result = validateParam(schema, value);
    if (!result.valid && result.error) {
      errors[paramId] = result.error;
    }
  }

  return errors;
};

/**
 * Extract JSON-serialisable UI metadata from a ParamSchema.
 * This is sent to the client island (Zod schemas stay server-side).
 *
 * @param schema - The ParamSchema to serialise.
 * @returns Serialised metadata safe for JSON transport.
 */
export const serializeParamMeta = (
  schema: ParamSchema,
  compatible = true,
): SerializedParamMeta => ({
  id: schema.id,
  name: schema.name,
  description: schema.description,
  category: schema.category,
  type: inferType(schema),
  hint: schema.hint,
  options: schema.options,
  min: schema.min,
  max: schema.max,
  compatible,
});

/**
 * Batch-serialise all param schemas for a device into a
 * client-consumable record.
 *
 * @param vendor - The vendor plugin.
 * @param deviceDef - The device definition.
 * @param config - The parsed config (to ensure we cover all params).
 * @returns Record of paramId → SerializedParamMeta.
 */
export const serializeAllParamMetas = (
  vendor: VendorPlugin,
  deviceDef: DeviceDefinition,
  config: Record<string, string>,
): Record<string, SerializedParamMeta> => {
  const metas: Record<string, SerializedParamMeta> = {};
  const deviceParamIds = new Set(Object.keys(deviceDef.paramSchemas));

  for (const paramId of Object.keys(config)) {
    const schema = vendor.getParamSchema(deviceDef.id, paramId);
    const compatible = deviceParamIds.has(paramId);
    metas[paramId] = serializeParamMeta(schema, compatible);
  }

  return metas;
};

/**
 * Build a full config map containing ALL vendor params.
 * Params present in the device's schemas use the provided config values;
 * params from other devices are included with empty values.
 *
 * @param vendor - The vendor plugin.
 * @param deviceDef - The target device definition.
 * @param config - Existing config (from upload or device defaults).
 * @returns Merged config covering every vendor param.
 */
export const buildFullVendorConfig = (
  vendor: VendorPlugin,
  deviceDef: DeviceDefinition,
  config: Record<string, string>,
): Record<string, string> => {
  const allIds = getAllVendorParamIds(vendor);
  const full: Record<string, string> = {};

  // Include all vendor params, using existing value or empty string
  for (const id of allIds) {
    full[id] = config[id] ?? "";
  }

  // Also include any config params not in the vendor superset (e.g. unknown params from file)
  for (const id of Object.keys(config)) {
    if (!(id in full)) full[id] = config[id];
  }

  return full;
};

/**
 * Infer the UI field type from a ParamSchema.
 * @internal
 */
const inferType = (schema: ParamSchema): "string" | "number" => {
  if (schema.min !== undefined || schema.max !== undefined) return "number";

  try {
    const zodDef = (schema.zodSchema as ZodNumber | ZodString | ZodEnum<[string, ...string[]]>)._def;
    if ("typeName" in zodDef && zodDef.typeName === ZodFirstPartyTypeKind.ZodNumber) {
      return "number";
    }
  } catch {
    // fall through
  }

  return "string";
};
