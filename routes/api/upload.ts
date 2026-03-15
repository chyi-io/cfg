import { detectVendorFromFile, getVendor, buildStructuredConfig } from "../../lib/registry.ts";
import { serializeAllParamMetas, buildFullVendorConfig } from "../../lib/validation.ts";
import { jsonResponse as json } from "../../lib/http.ts";
import { define } from "../../utils.ts";

export const handler = define.handlers({
  async POST(ctx) {
    try {
      const formData = await ctx.req.formData();
      const file = formData.get("file") as File;

      if (!file) {
        return json({ error: "No file uploaded" }, 400);
      }

      const buffer = new Uint8Array(await file.arrayBuffer());
      const detection = await detectVendorFromFile(buffer, file.name);

      if (!detection) {
        return json({ error: "Unrecognized file format" }, 400);
      }

      const vendor = getVendor(detection.vendorId)!;
      const deviceDef = vendor.devices.find((d) => d.id === detection.deviceId);
      const config = deviceDef
        ? buildFullVendorConfig(vendor, deviceDef, detection.config)
        : detection.config;
      const structured = buildStructuredConfig(vendor, config);
      const paramMetas = deviceDef
        ? serializeAllParamMetas(vendor, deviceDef, config)
        : {};

      return json({
        success: true,
        vendorId: detection.vendorId,
        deviceId: detection.deviceId,
        config,
        structured,
        categories: deviceDef?.categories ?? [],
        paramMetas,
      });
    } catch (error) {
      return json({
        error: error instanceof Error ? error.message : "Unknown error",
      }, 500);
    }
  },
});
