import { getDeviceDefinition, getVendor } from "../../lib/registry.ts";
import { validateConfig } from "../../lib/validation.ts";
import { jsonResponse as json } from "../../lib/http.ts";
import { define } from "../../utils.ts";

export const handler = define.handlers({
  async POST(ctx) {
    try {
      const body = await ctx.req.json();
      const { vendorId, deviceId, config } = body;

      if (!config || typeof config !== "object") {
        return json({ error: "Invalid configuration" }, 400);
      }

      const vendor = getVendor(vendorId ?? "teltonika");
      if (!vendor) {
        return json({ error: `Unknown vendor: ${vendorId}` }, 400);
      }

      const deviceDef = getDeviceDefinition(vendor.id, deviceId ?? "fmb");
      if (deviceDef) {
        const errors = validateConfig(vendor, deviceDef, config);
        const errorList = Object.entries(errors).map(([k, v]) => ({
          parameter: k,
          error: v,
        }));
        if (errorList.length > 0) {
          return json({ error: "Validation failed", errors: errorList }, 400);
        }
      }

      const buffer = await vendor.generate(config);
      const ext = vendor.fileExtensions[0] ?? ".cfg";

      return new Response(buffer.buffer as ArrayBuffer, {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename="config${ext}"`,
        },
      });
    } catch (error) {
      return json({
        error: error instanceof Error ? error.message : "Unknown error",
      }, 500);
    }
  },
});
