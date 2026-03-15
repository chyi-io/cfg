import { App, staticFiles } from "fresh";
import { registerVendor, _clearVendors } from "./lib/registry.ts";
import { teltonikaPlugin } from "./vendors/teltonika/mod.ts";
import { ruptelaPlugin } from "./vendors/ruptela/mod.ts";
import { chafonPlugin } from "./vendors/chafon/mod.ts";

// Clear + re-register on each Vite HMR reload
_clearVendors();
registerVendor(teltonikaPlugin);
registerVendor(ruptelaPlugin);
registerVendor(chafonPlugin);

export const app = new App()
  .use(staticFiles())
  .fsRoutes();
