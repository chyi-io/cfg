/**
 * Client-safe types shared between islands and presentational components.
 * These mirror the serialized shapes sent from the API.
 * @module
 */

export interface ParamOption {
  value: string;
  label: string;
}

export interface ParamMeta {
  id: string;
  name: string;
  description: string;
  category: string;
  type: "string" | "number";
  hint?: string;
  options?: ParamOption[];
  min?: number;
  max?: number;
  compatible: boolean;
}

export interface CategoryDef {
  id: string;
  label: string;
  icon: string;
  color: string;
  order: number;
  deviceOnly?: string;
}

export interface ConfigData {
  vendorId: string;
  deviceId: string;
  config: Record<string, string>;
  structured: Record<string, Record<string, string>>;
  categories: CategoryDef[];
  paramMetas: Record<string, ParamMeta>;
}
