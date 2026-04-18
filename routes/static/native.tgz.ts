// Serves a gzip tarball of <repo>/agent/native/ on demand. The install script
// downloads this and extracts it next to the chyi-cfg-agent binary so libCFApi.so
// and libhid.so live where the agent expects them.

import { define } from "../../utils.ts";
import { join } from "jsr:@std/path@^1";

const NATIVE_DIR = join(Deno.cwd(), "agent", "native");

export const handler = define.handlers({
  async GET() {
    try {
      await Deno.stat(NATIVE_DIR);
    } catch {
      return new Response("agent/native/ not present", { status: 404 });
    }

    // Use the system `tar` to avoid pulling a full tar implementation in.
    // Only include the .so files; skip README / SHA256SUMS to keep size down.
    const cmd = new Deno.Command("tar", {
      args: [
        "-czf",
        "-",
        "-C",
        NATIVE_DIR,
        "--exclude=README.md",
        "--exclude=SHA256SUMS",
        "libCFApi.so",
        "libhid.so",
      ],
      stdout: "piped",
      stderr: "piped",
    }).spawn();

    return new Response(cmd.stdout, {
      headers: {
        "Content-Type": "application/gzip",
        "Content-Disposition": 'attachment; filename="native.tgz"',
        "Cache-Control": "no-store",
      },
    });
  },
});
