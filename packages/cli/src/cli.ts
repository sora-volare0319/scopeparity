import { Command, CommanderError, Option } from "commander";

import { formatDoctorResult, inspectEnvironment } from "./doctor.js";
import { errorMessage } from "./errors.js";
import { RULE_EXPLANATIONS, listRuleCodes } from "./explanations.js";
import { initializeManifest } from "./init.js";
import { type CliIo, line, processIo, safeTerminalText, terminalSafeIo } from "./io.js";
import {
  runScanCommand,
  type ScanCommandOptions,
  type TerminalFormat,
} from "./scan.js";

const VERSION = "0.1.3";

async function captureFailure(
  operation: () => Promise<number>,
  io: CliIo,
): Promise<number> {
  try {
    return await operation();
  } catch (error) {
    io.err(line(`ScopeParity could not run: ${errorMessage(error)}`));
    return 2;
  }
}

function formatExplanation(ruleInput: string): string {
  const rule = ruleInput.toUpperCase();
  const explanation = RULE_EXPLANATIONS.get(rule);
  if (explanation === undefined) {
    throw new Error(
      `Unknown rule "${ruleInput}". Available rules: ${listRuleCodes().join(", ")}`,
    );
  }

  return [
    explanation.code,
    `Group: ${explanation.group}`,
    "",
    explanation.summary,
    "",
    `Next: ${explanation.nextAction}`,
    `Official source: ${explanation.sourceUrl}`,
    "",
  ].join("\n");
}

export function createProgram(rawIo: CliIo = processIo): Command {
  const io = terminalSafeIo(rawIo);
  const program = new Command();
  program
    .name("scopeparity")
    .description(
      "Compare Google OAuth code, configuration, public identity, and launch evidence without credentials.",
    )
    .version(VERSION)
    .showSuggestionAfterError(true)
    .showHelpAfterError()
    .exitOverride()
    .configureOutput({
      writeOut: (message) => io.out(message),
      writeErr: (message) => io.err(message),
    });
  program.action(() => {
    program.outputHelp();
    program.setOptionValue("scopeParityExitCode", 0);
  });

  program
    .command("scan")
    .description("Scan tracked source and compare it with secret-free OAuth evidence")
    .argument("[root]", "Git project root", ".")
    .option(
      "--manifest <path>",
      "manifest path, resolved from the project root",
      "oauth-evidence.yaml",
    )
    .addOption(
      new Option("--format <format>", "terminal output format")
        .choices(["pretty", "json"])
        .default("pretty"),
    )
    .option(
      "--check-urls",
      "opt in to bounded HTTPS checks for the declared public homepage",
    )
    .option("--report <path>", "write a self-contained .html or .json report")
    .action(
      async (
        root: string,
        options: {
          manifest: string;
          format: TerminalFormat;
          report?: string;
          checkUrls?: boolean;
        },
      ) => {
        const exitCode = await captureFailure(async () => {
          const scanOptions: ScanCommandOptions = {
            manifest: options.manifest,
            format: options.format,
            ...(options.checkUrls === undefined ? {} : { checkUrls: options.checkUrls }),
            ...(options.report === undefined ? {} : { report: options.report }),
          };
          const result = await runScanCommand(root, scanOptions);
          io.out(result.output);
          if (result.reportPath !== undefined) {
            const message = line(`Report written: ${result.reportPath}`);
            if (options.format === "json") {
              io.err(message);
            } else {
              io.out(message);
            }
          }
          return result.exitCode;
        }, io);
        program.setOptionValue("scopeParityExitCode", exitCode);
      },
    );

  program
    .command("init")
    .description("Create a secret-free oauth-evidence.yaml template")
    .argument("[root]", "project root", ".")
    .action(async (root: string) => {
      const exitCode = await captureFailure(async () => {
        const manifestPath = await initializeManifest(root);
        io.out(
          [
            `Created ${manifestPath}`,
            "Edit the public identity, declared scopes, feature routes, and video steps, then run scopeparity scan.",
            "No Google client ID, secret, token, credential, or Cloud access was requested.",
            "",
          ].join("\n"),
        );
        return 0;
      }, io);
      program.setOptionValue("scopeParityExitCode", exitCode);
    });

  program
    .command("doctor")
    .description("Check the local scan boundary and required tools")
    .argument("[root]", "project root", ".")
    .action(async (root: string) => {
      const exitCode = await captureFailure(async () => {
        const result = await inspectEnvironment(root);
        io.out(formatDoctorResult(result));
        return result.healthy ? 0 : 1;
      }, io);
      program.setOptionValue("scopeParityExitCode", exitCode);
    });

  program
    .command("explain")
    .description("Explain one deterministic finding and its next action")
    .argument("<rule>", "rule ID, for example SCOPE_IN_CODE_NOT_DECLARED")
    .action(async (rule: string) => {
      const exitCode = await captureFailure(async () => {
        io.out(formatExplanation(rule));
        return 0;
      }, io);
      program.setOptionValue("scopeParityExitCode", exitCode);
    });

  return program;
}

export async function runCli(
  argv: readonly string[],
  io: CliIo = processIo,
): Promise<number> {
  const program = createProgram(io);
  try {
    await program.parseAsync([...argv], { from: "user" });
  } catch (error) {
    if (
      error instanceof CommanderError &&
      (error.code === "commander.helpDisplayed" ||
        error.code === "commander.version")
    ) {
      return 0;
    }
    if (error instanceof CommanderError) {
      return 2;
    }
    io.err(line(`ScopeParity could not run: ${safeTerminalText(errorMessage(error))}`));
    return 2;
  }

  const exitCode = program.getOptionValue("scopeParityExitCode");
  return typeof exitCode === "number" ? exitCode : 0;
}
