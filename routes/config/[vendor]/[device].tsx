import ConfigLoaderIsland from "../../../islands/ConfigLoaderIsland.tsx";
import { define } from "../../../utils.ts";

export default define.page(function ConfigVendorDevicePage(ctx) {
  const { vendor, device } = ctx.params;
  return <ConfigLoaderIsland vendorId={vendor} deviceId={device} />;
});
