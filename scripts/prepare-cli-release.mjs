import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const targetArgument = process.argv.slice(2).find((argument) => argument !== "--");

if (!targetArgument) {
  throw new Error("Usage: pnpm release:cli:github -- <new-empty-target-directory>");
}

const target = path.resolve(targetArgument);
const privateReleaseRoot = path.join(repositoryRoot, "commercial");
const insidePublicTree =
  target === repositoryRoot ||
  (target.startsWith(`${repositoryRoot}${path.sep}`) &&
    target !== privateReleaseRoot &&
    !target.startsWith(`${privateReleaseRoot}${path.sep}`));
if (insidePublicTree) {
  throw new Error("Release output must be outside the public source repository");
}

if (await stat(target).catch(() => undefined)) {
  throw new Error(`Refusing to write into an existing path: ${target}`);
}

const cliPackage = JSON.parse(
  await readFile(path.join(repositoryRoot, "packages/cli/package.json"), "utf8"),
);
const packageJson = {
  name: cliPackage.name,
  version: cliPackage.version,
  description: cliPackage.description,
  type: "module",
  license: "MIT",
  sideEffects: false,
  bin: { scopeparity: "./dist/index.js" },
  files: ["dist", "LICENSE", "README.md"],
  engines: { node: ">=22" },
  repository: {
    type: "git",
    url: "git+https://github.com/sora-volare0319/scopeparity.git",
  },
  homepage: "https://scopeparity.vercel.app/",
  bugs: { url: "https://github.com/sora-volare0319/scopeparity/issues" },
};

const releaseRef = `v${cliPackage.version}`;
const releaseCommand = `npx -y github:sora-volare0319/scopeparity-cli#${releaseRef}`;
const readme = `# ScopeParity CLI release\n\nThis repository is the dependency-free, bundled distribution of the open-source ScopeParity CLI. Source, tests, fixtures, and security documentation live at https://github.com/sora-volare0319/scopeparity. The interactive report and exact-error guides are at https://scopeparity.vercel.app/.\n\nCreate the secret-free manifest once:\n\n\`\`\`bash\n${releaseCommand} init .\n\`\`\`\n\nReview \`oauth-evidence.yaml\`, replace the example values with the launch values you intend to submit, then scan:\n\n\`\`\`bash\n${releaseCommand} scan . --manifest oauth-evidence.yaml\n\`\`\`\n\nThe scan stays local by default and never requests Google credentials. Nothing is sent automatically. ScopeParity finds deterministic technical inconsistencies; it does not provide legal or policy advice, assess restricted scopes, or guarantee Google approval.\n`;

await mkdir(path.join(target, "dist"), { recursive: true });
const bundledCli = await readFile(path.join(repositoryRoot, "packages/cli/dist/index.js"), "utf8");
await writeFile(
  path.join(target, "dist/index.js"),
  bundledCli.replace(/[ \t]+$/gmu, ""),
  { encoding: "utf8", mode: 0o755 },
);
await copyFile(path.join(repositoryRoot, "LICENSE"), path.join(target, "LICENSE"));
await writeFile(path.join(target, "README.md"), readme, "utf8");
await writeFile(path.join(target, "package.json"), `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");

process.stdout.write(`${target}\n`);
