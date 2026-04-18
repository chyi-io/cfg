import { define } from "../../../utils.ts";
import { jsonResponse } from "../../../lib/http.ts";
import { version } from "../../../shared/version.ts";
import { PROTOCOL_VERSION } from "../../../shared/protocol.ts";

export const handler = define.handlers({
  GET() {
    return jsonResponse({
      ok: true,
      version: version(),
      protocolVersion: PROTOCOL_VERSION,
    });
  },
});
