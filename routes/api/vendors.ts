import { listVendors } from "../../lib/registry.ts";
import { jsonResponse } from "../../lib/http.ts";
import { define } from "../../utils.ts";

export const handler = define.handlers({
  GET(_ctx) {
    const vendors = listVendors().map((v) => ({
      id: v.id,
      name: v.name,
      fileExtensions: v.fileExtensions,
      devices: v.devices.map((d) => ({
        id: d.id,
        name: d.name,
        vendorId: d.vendorId,
        categoryCount: d.categories.length,
        paramCount: Object.keys(d.paramSchemas).length,
      })),
    }));

    return jsonResponse({ vendors });
  },
});
