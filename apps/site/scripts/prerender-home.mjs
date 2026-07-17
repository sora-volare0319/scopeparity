import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const siteDirectory = path.resolve(scriptDirectory, "..");
const outputPath = path.join(siteDirectory, "dist", "index.html");
const serverDirectory = path.join(siteDirectory, ".ssr");
const serverEntryPath = path.join(serverDirectory, "entry-server.js");

const template = await readFile(outputPath, "utf8");
const { render } = await import(pathToFileURL(serverEntryPath).href);
const rendered = render();

if (!template.includes('<div id="root"></div>')) {
  throw new Error("Home prerender target was not found in the Vite output");
}

await writeFile(outputPath, template.replace('<div id="root"></div>', `<div id="root">${rendered}</div>`), "utf8");
await rm(serverDirectory, { recursive: true, force: true });

process.stdout.write("Prerendered the ScopeParity home route.\n");
