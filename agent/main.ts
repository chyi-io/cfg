import { maybeReexec } from "./bootstrap.ts";
import { configExists, loadConfig } from "./config.ts";
import { Dispatcher } from "./dispatcher.ts";
import { WsClient } from "./ws_client.ts";
import { log } from "./log.ts";
import {
  doctorCmd,
  helpCmd,
  logsCmd,
  pairCmd,
  resetCmd,
  setupCmd,
  statusCmd,
  uninstallCmd,
  updateCmd,
  versionCmd,
  welcomeBanner,
} from "./lifecycle.ts";
import { initBuiltinDrivers } from "./drivers/index.ts";
import { stripAgentWsPath, wsUrlToHttp } from "../shared/protocol.ts";
import { term } from "./term.ts";

/** True if we're running as the systemd-managed service itself. systemd sets
 *  INVOCATION_ID (and JOURNAL_STREAM) on every service invocation — their
 *  presence reliably distinguishes the service process from an ad-hoc
 *  foreground run. */
function isRunningUnderSystemd(): boolean {
  return Deno.env.get("INVOCATION_ID") !== undefined ||
    Deno.env.get("JOURNAL_STREAM") !== undefined;
}

async function isSystemdUnitActive(): Promise<boolean> {
  try {
    const r = await new Deno.Command("systemctl", {
      args: ["--user", "is-active", "--quiet", "chyi-cfg-agent.service"],
      stdout: "null",
      stderr: "null",
    }).output();
    return r.success;
  } catch {
    return false; // systemctl not available — can't detect, let it run
  }
}

async function runCmd(): Promise<number> {
  initBuiltinDrivers();

  // Refuse to start a foreground agent when the systemd service is ALREADY
  // running — two agents with the same agentId fight over the cloud connection,
  // browsers then get stuck on "connecting...". Skip the check if we ARE the
  // systemd-managed process (INVOCATION_ID is set), else we'd refuse ourselves
  // into an infinite restart loop.
  if (
    !isRunningUnderSystemd() &&
    !Deno.args.includes("--force") &&
    await isSystemdUnitActive()
  ) {
    console.error(
      term.fail("chyi-cfg-agent.service is already running under systemd."),
    );
    console.error(
      term.gray(
        "  Two agents with the same agentId fight over the cloud connection;",
      ),
    );
    console.error(
      term.gray(
        "  browsers then get stuck on 'connecting...'. Stop the service first:",
      ),
    );
    console.error("");
    console.error("    systemctl --user stop chyi-cfg-agent.service");
    console.error("");
    console.error(
      term.gray("  Or follow its logs without starting a second instance:"),
    );
    console.error("    chyi-cfg-agent logs");
    console.error("");
    console.error(
      term.gray(
        "  (pass --force to run anyway — expect pairing to be unstable.)",
      ),
    );
    return 1;
  }

  const firstRun = !configExists();
  if (firstRun) {
    welcomeBanner();
    console.log(term.yellow("  No config found — using defaults."));
    console.log(
      term.gray(
        "  Run `chyi-cfg-agent setup` for interactive first-time setup.",
      ),
    );
    console.log("");
  }

  const config = loadConfig();
  const dispatcher = new Dispatcher(config.maxQueue);

  let currentPairCode: string | null = null;

  const client = new WsClient(config, dispatcher, {
    onPairCode(code, expiresAt) {
      currentPairCode = code;
      const base = stripAgentWsPath(wsUrlToHttp(config.cloudUrl));
      log.info("pair.code", { code, expiresAt });
      console.log("");
      console.log(
        `  chyi-cfg-agent ready — pair at ${base}/live with code ${code}`,
      );
      console.log(`  (code expires at ${new Date(expiresAt).toISOString()})`);
      console.log("");
    },
    onReady() {
      log.info("ready", { agentId: config.agentId });
    },
    onClose() {
      currentPairCode = null;
    },
  });

  const shutdown = async () => {
    log.info("shutdown", {});
    client.stop();
    await dispatcher.shutdown();
    Deno.exit(0);
  };
  Deno.addSignalListener("SIGINT", shutdown);
  try {
    Deno.addSignalListener("SIGTERM", shutdown);
  } catch {
    // SIGTERM is not supported on Windows.
  }

  client.start();
  // Hang forever — signal handler will exit.
  await new Promise(() => {});
  void currentPairCode;
  return 0;
}

async function main(): Promise<void> {
  const cmd = Deno.args[0] ?? "run";
  let code = 0;
  switch (cmd) {
    case "run":
      code = await runCmd();
      break;
    case "setup":
      code = await setupCmd();
      break;
    case "status":
      code = statusCmd();
      break;
    case "doctor":
      code = await doctorCmd();
      break;
    case "pair":
      code = await pairCmd();
      break;
    case "reset":
      code = resetCmd();
      break;
    case "uninstall": {
      const autoYes = Deno.args.includes("--yes") || Deno.args.includes("-y");
      code = await uninstallCmd(autoYes);
      break;
    }
    case "update": {
      // Forward any flags after `update` (e.g. --force, --no-start) to the installer.
      code = await updateCmd(Deno.args.slice(1));
      break;
    }
    case "logs":
      code = await logsCmd();
      break;
    case "version":
    case "--version":
    case "-v":
      code = versionCmd();
      break;
    case "--help":
    case "-h":
    case "help":
      code = helpCmd();
      break;
    default:
      console.error(term.fail(`Unknown command: ${cmd}`));
      console.error(term.gray("  Run `chyi-cfg-agent help` for usage."));
      code = 2;
  }
  Deno.exit(code);
}

if (import.meta.main) {
  await maybeReexec();
  await main();
}
