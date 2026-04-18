import {
  buildStructuredConfig,
  getDeviceDefinition,
  getVendor,
} from "../../lib/registry.ts";
import {
  buildFullVendorConfig,
  serializeAllParamMetas,
} from "../../lib/validation.ts";
import { jsonResponse as json } from "../../lib/http.ts";
import { define } from "../../utils.ts";

export const handler = define.handlers({
  GET(ctx) {
    const url = new URL(ctx.req.url);
    const vendorId = url.searchParams.get("vendor") ?? "teltonika";
    const deviceId = url.searchParams.get("device") ?? "fmb";

    const vendor = getVendor(vendorId);
    if (!vendor) {
      return json({ error: `Unknown vendor: ${vendorId}` }, 400);
    }

    const deviceDef = getDeviceDefinition(vendorId, deviceId);
    if (!deviceDef) {
      return json({ error: `Unknown device: ${deviceId}` }, 400);
    }

    const config = buildFullVendorConfig(vendor, deviceDef, {
      ...deviceDef.defaults,
    });
    const structured = buildStructuredConfig(vendor, config);
    const paramMetas = serializeAllParamMetas(vendor, deviceDef, config);

    return json({
      success: true,
      vendorId,
      deviceId,
      config,
      structured,
      categories: deviceDef.categories,
      paramMetas,
    });
  },
});
