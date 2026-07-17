import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const siteDirectory = path.resolve(scriptDirectory, "..");
const outputPath = path.join(siteDirectory, "dist", "index.html");
const serverDirectory = path.join(siteDirectory, ".ssr");
const serverEntryPath = path.join(serverDirectory, "entry-server.js");
const rootStartMarker = "<!--scopeparity-prerender:start-->";
const rootEndMarker = "<!--scopeparity-prerender:end-->";

const template = await readFile(outputPath, "utf8");
const { render } = await import(pathToFileURL(serverEntryPath).href);
const rendered = render();

const rootStart = template.indexOf(rootStartMarker);
const rootEnd = template.indexOf(rootEndMarker);
if (rootStart < 0 || rootEnd <= rootStart) {
  throw new Error("Home prerender boundary was not found in the Vite output");
}

const prerenderedRoot = `${rootStartMarker}<div id="root">${rendered}</div>${rootEndMarker}`;
await writeFile(
  outputPath,
  `${template.slice(0, rootStart)}${prerenderedRoot}${template.slice(rootEnd + rootEndMarker.length)}`,
  "utf8",
);
await rm(serverDirectory, { recursive: true, force: true });

process.stdout.write("Prerendered the ScopeParity home route.\n");
