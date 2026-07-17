import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contractPath = path.join(repositoryRoot, "content", "public-examples.json");
const fixtureRoot = path.join(repositoryRoot, "fixtures", "public-examples");
const outputRoot = path.join(repositoryRoot, "apps", "site", "public", "examples");
const coreEntryPath = path.join(repositoryRoot, "packages", "core", "dist", "index.js");
const mode = process.argv[2];

if (mode !== "--write" && mode !== "--check") {
  throw new Error("Usage: node scripts/public-examples.mjs --write|--check");
}

const contract = JSON.parse(await readFile(contractPath, "utf8"));
if (!/^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/u.test(contract.snapshotAt)) {
  throw new Error("public-examples.json requires a stable UTC snapshotAt date");
}
if (!/^\d{4}\.\d{2}\.\d{2}\.\d+$/u.test(contract.rulesetVersion)) {
  throw new Error("public-examples.json requires a pinned rulesetVersion");
}
if (!Array.isArray(contract.cases) || contract.cases.length !== 3) {
  throw new Error("Exactly three public example cases are required");
}

const { renderHtmlReport, renderJsonReport, scanProject } = await import(
  pathToFileURL(coreEntryPath).href
);

function publicHtmlReport(html) {
  return html.replace(
    '<meta name="referrer" content="no-referrer">',
    '<meta name="robots" content="noindex,follow">\n  <meta name="referrer" content="no-referrer">',
  );
}

async function persistOrCompare(filePath, contents) {
  if (mode === "--write") {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, contents, "utf8");
    return;
  }

  const existing = await readFile(filePath, "utf8").catch(() => undefined);
  if (existing === undefined) {
    throw new Error(`Missing generated public example: ${path.relative(repositoryRoot, filePath)}`);
  }
  if (existing !== contents) {
    throw new Error(`Stale generated public example: ${path.relative(repositoryRoot, filePath)}`);
  }
}

async function buildPhase(exampleCase, phase) {
  const fixtureDirectory = path.join(fixtureRoot, exampleCase.slug, phase);
  const temporaryParent = await mkdtemp(path.join(tmpdir(), "scopeparity-public-example-"));
  const projectRoot = path.join(temporaryParent, "project");

  try {
    await cp(fixtureDirectory, projectRoot, { recursive: true });
    await execFileAsync("git", ["init", "-q"], { cwd: projectRoot });
    await execFileAsync("git", ["add", "oauth-evidence.yaml", "src/auth.ts"], { cwd: projectRoot });

    const result = await scanProject({
      root: projectRoot,
      manifestPath: path.join(projectRoot, "oauth-evidence.yaml"),
    });
    const stableResult = { ...result, generatedAt: contract.snapshotAt };
    if (stableResult.rulesetVersion !== contract.rulesetVersion) {
      throw new Error(
        `${exampleCase.slug}/${phase} ruleset changed: expected ${contract.rulesetVersion}; received ${stableResult.rulesetVersion}`,
      );
    }
    const expectedRules = exampleCase[`${phase}Rules`];
    const actualRules = stableResult.findings.map((finding) => finding.ruleId);
    if (JSON.stringify(actualRules) !== JSON.stringify(expectedRules)) {
      throw new Error(
        `${exampleCase.slug}/${phase} rules changed: expected ${expectedRules.join(", ")}; received ${actualRules.join(", ")}`,
      );
    }
    if (phase === "before" && stableResult.summary.blockers < 1) {
      throw new Error(`${exampleCase.slug}/before must contain an objective inconsistency`);
    }
    if (phase === "after" && stableResult.summary.blockers !== 0) {
      throw new Error(`${exampleCase.slug}/after must contain zero objective inconsistencies`);
    }

    const destination = path.join(outputRoot, exampleCase.slug);
    await Promise.all([
      persistOrCompare(path.join(destination, `${phase}.json`), renderJsonReport(stableResult)),
      persistOrCompare(
        path.join(destination, `${phase}.html`),
        publicHtmlReport(renderHtmlReport(stableResult)),
      ),
      persistOrCompare(
        path.join(destination, `${phase}-oauth-evidence.yaml`),
        await readFile(path.join(projectRoot, "oauth-evidence.yaml"), "utf8"),
      ),
      persistOrCompare(
        path.join(destination, `${phase}-auth.ts.txt`),
        await readFile(path.join(projectRoot, "src", "auth.ts"), "utf8"),
      ),
    ]);

    return `${exampleCase.slug}/${phase}: ${stableResult.summary.blockers} blocker(s)`;
  } finally {
    const expectedPrefix = path.join(tmpdir(), "scopeparity-public-example-");
    if (!temporaryParent.startsWith(expectedPrefix)) {
      throw new Error(`Refusing to remove unexpected temporary path: ${temporaryParent}`);
    }
    await rm(temporaryParent, { recursive: true, force: true });
  }
}

const results = [];
for (const exampleCase of contract.cases) {
  if (!/^[a-z0-9-]+$/u.test(exampleCase.slug)) {
    throw new Error(`Unsafe public example slug: ${exampleCase.slug}`);
  }
  for (const phase of ["before", "after"]) {
    results.push(await buildPhase(exampleCase, phase));
  }
}

process.stdout.write(
  `${mode === "--write" ? "Generated" : "Verified"} ${results.length} deterministic public example snapshots.\n${results.join("\n")}\n`,
);
