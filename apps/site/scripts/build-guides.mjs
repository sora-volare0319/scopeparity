import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { marked } from "marked";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const siteDirectory = path.resolve(scriptDirectory, "..");
const contentDirectory = path.resolve(siteDirectory, "../../content");
const outputDirectory = path.join(siteDirectory, "public", "guides");
const siteOrigin = "https://scopeparity.vercel.app";
const defaultCliPrefix = "npx -y github:sora-volare0319/scopeparity-cli#v0.1.0";
const configuredPrefix = process.env.VITE_CLI_PREFIX?.trim() ?? "";
const cliPrefix =
  configuredPrefix && configuredPrefix.length <= 300 && !/[\u0000-\u001f\u007f-\u009f]/u.test(configuredPrefix)
    ? configuredPrefix
    : defaultCliPrefix;

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseFrontmatter(source, filename) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/u.exec(source);
  if (!match) throw new Error(`Missing frontmatter: ${filename}`);
  const metadata = {};
  for (const line of match[1].split(/\r?\n/u)) {
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim();
    const raw = line.slice(separator + 1).trim();
    metadata[key] = raw.startsWith('"') ? JSON.parse(raw) : raw;
  }
  for (const key of ["title", "description", "intent", "slug"]) {
    if (!metadata[key]) throw new Error(`Missing ${key} frontmatter: ${filename}`);
  }
  if (!/^[a-z0-9-]+$/u.test(metadata.slug)) throw new Error(`Unsafe guide slug: ${metadata.slug}`);
  return { metadata, body: source.slice(match[0].length) };
}

const guideCss = `
:root{color-scheme:light;--paper:#f2eee5;--ink:#1d2528;--muted:#64645f;--rule:#c7c0b3;--cobalt:#2b55cc;--coral:#a74432}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.68 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}a{color:var(--cobalt);text-underline-offset:.18em}a:focus-visible{outline:3px solid var(--cobalt);outline-offset:4px}.shell{width:min(1120px,calc(100% - 36px));margin:0 auto}.site-head{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--rule);padding:18px 0;font-size:13px}.brand{display:flex;align-items:center;gap:9px;color:var(--ink);font-weight:720;text-decoration:none}.brand-mark{display:grid;place-items:center;width:23px;height:23px;border:1px solid var(--ink);font:700 11px/1 ui-monospace,monospace}.site-head nav{display:flex;gap:22px}.site-head nav a{color:var(--ink)}main{display:grid;grid-template-columns:minmax(0,720px) 1fr;gap:clamp(40px,8vw,110px);padding:64px 0 100px}.article,.rail{min-width:0}.article-head{border-top:4px solid var(--ink);padding-top:24px;margin-bottom:42px}.eyebrow{color:var(--coral);font:700 11px/1.2 ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase}.article-head h1{font-size:clamp(42px,7vw,76px);line-height:.96;letter-spacing:-.055em;margin:24px 0;max-width:13ch}.lede{font-size:19px;color:var(--muted);max-width:58ch}.article h2{font-size:30px;line-height:1.1;letter-spacing:-.03em;margin:58px 0 14px;padding-top:22px;border-top:1px solid var(--rule)}.article h3{font-size:20px;margin-top:34px}.article p,.article li{max-width:68ch}.article li+li{margin-top:8px}.article pre{max-width:100%;overflow:auto;background:#20292c;color:#f6f0e5;border-left:5px solid var(--coral);padding:18px 20px;margin:28px 0}.article code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:.9em;overflow-wrap:anywhere}.article :not(pre)>code{background:#e6dfd1;padding:.1em .34em}.rail{align-self:start;position:sticky;top:24px;border-top:1px solid var(--ink);padding-top:18px}.rail strong{display:block;font-size:13px}.rail p{font-size:13px;color:var(--muted)}.command{display:block;background:#20292c;color:#f6f0e5;padding:14px;margin:18px 0;font-size:12px;overflow-wrap:anywhere}.rail a.cta{display:inline-flex;background:var(--ink);color:#fff;padding:12px 15px;text-decoration:none;font-weight:700}.related{border-top:1px solid var(--rule);margin-top:64px;padding-top:24px}.related ul{padding:0;list-style:none}.related a{display:block;border-bottom:1px solid var(--rule);padding:12px 0}.site-foot{border-top:1px solid var(--rule);padding:24px 0 50px;color:var(--muted);font-size:12px}@media(max-width:800px){main{grid-template-columns:1fr;padding-top:38px}.rail{position:static;order:-1}.article-head h1{font-size:46px}.site-head nav a:first-child{display:none}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
`;

function guidePage(guide, allGuides) {
  const { metadata, body } = guide;
  const pageUrl = `${siteOrigin}/guides/${metadata.slug}/`;
  const article = marked
    .parse(
      body
        .replaceAll(defaultCliPrefix, cliPrefix)
        .replaceAll("npx scopeparity", cliPrefix),
      { gfm: true },
    )
    .replaceAll("<pre>", '<pre tabindex="0">');
  const related = allGuides
    .filter((candidate) => candidate.metadata.slug !== metadata.slug)
    .slice(0, 3)
    .map(
      (candidate) =>
        `<li><a href="/guides/${escapeHtml(candidate.metadata.slug)}/">${escapeHtml(candidate.metadata.title)}</a></li>`,
    )
    .join("");
  return `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${escapeHtml(metadata.description)}"><meta name="robots" content="index,follow"><link rel="canonical" href="${escapeHtml(pageUrl)}"><meta property="og:type" content="article"><meta property="og:url" content="${escapeHtml(pageUrl)}"><meta property="og:title" content="${escapeHtml(metadata.title)}"><meta property="og:description" content="${escapeHtml(metadata.description)}"><meta property="og:image" content="${siteOrigin}/og.png"><meta name="twitter:card" content="summary_large_image"><title>${escapeHtml(metadata.title)} · ScopeParity</title><style>${guideCss}</style></head>
<body><div class="shell"><header class="site-head"><a class="brand" href="/"><span class="brand-mark">SP</span>ScopeParity</a><nav aria-label="Guide navigation"><a href="/guides/">Guides</a><a href="/#sample">Sample report</a><a href="/#pricing">Pricing</a></nav></header>
<main><article class="article"><header class="article-head"><span class="eyebrow">Technical guide · ${escapeHtml(metadata.intent)}</span><h1>${escapeHtml(metadata.title)}</h1><p class="lede">${escapeHtml(metadata.description)}</p></header>${article}<aside class="related"><h2>Related diagnostics</h2><ul>${related}</ul></aside></article>
<aside class="rail" aria-label="Run ScopeParity"><strong>Compare the evidence locally</strong><p>Tracked files only. No Google credentials. No source upload.</p><code class="command">${escapeHtml(`${cliPrefix} scan .`)}</code><a class="cta" href="/#cli">See the local workflow</a><p>ScopeParity finds technical inconsistencies. It does not predict or guarantee approval.</p></aside></main>
<footer class="site-foot">ScopeParity is an independent developer tool and is not affiliated with Google.</footer></div></body></html>`;
}

function indexPage(guides) {
  const rows = guides
    .map(
      ({ metadata }) =>
        `<li><a href="/guides/${escapeHtml(metadata.slug)}/"><strong>${escapeHtml(metadata.title)}</strong><span>${escapeHtml(metadata.description)}</span></a></li>`,
    )
    .join("");
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Technical diagnostics for Google OAuth launch scope drift, public identity, and demonstration evidence."><meta name="robots" content="index,follow"><link rel="canonical" href="${siteOrigin}/guides/"><meta property="og:type" content="website"><meta property="og:url" content="${siteOrigin}/guides/"><meta property="og:title" content="Google OAuth launch diagnostics · ScopeParity"><meta property="og:description" content="Technical diagnostics for launch scope drift, public identity, and demonstration evidence."><meta property="og:image" content="${siteOrigin}/og.png"><meta name="twitter:card" content="summary_large_image"><title>Google OAuth launch diagnostics · ScopeParity</title><style>${guideCss}.guide-index{grid-column:1/-1}.guide-index h1{font-size:clamp(48px,9vw,96px);line-height:.9;letter-spacing:-.06em;max-width:10ch}.guide-index ul{list-style:none;padding:0;margin-top:54px}.guide-index li{border-top:1px solid var(--rule)}.guide-index li:last-child{border-bottom:1px solid var(--rule)}.guide-index li a{display:grid;grid-template-columns:1fr 1fr;gap:28px;color:var(--ink);padding:24px 0;text-decoration:none}.guide-index span{color:var(--muted)}@media(max-width:700px){.guide-index li a{grid-template-columns:1fr}}</style></head><body><div class="shell"><header class="site-head"><a class="brand" href="/"><span class="brand-mark">SP</span>ScopeParity</a><nav aria-label="Guide navigation"><a href="/#sample">Sample report</a><a href="/#pricing">Pricing</a></nav></header><main><section class="guide-index"><span class="eyebrow">Field notes / exact failure modes</span><h1>Google OAuth launch diagnostics.</h1><p class="lede">Technical steps for the mismatches software can prove—and a clear boundary around what still requires reviewer judgment.</p><ul>${rows}</ul></section></main><footer class="site-foot">ScopeParity is an independent developer tool and is not affiliated with Google.</footer></div></body></html>`;
}

const filenames = (await readdir(contentDirectory)).filter((filename) => filename.endsWith(".md"));
const guides = await Promise.all(
  filenames.map(async (filename) =>
    parseFrontmatter(await readFile(path.join(contentDirectory, filename), "utf8"), filename),
  ),
);
guides.sort((a, b) => a.metadata.title.localeCompare(b.metadata.title));

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await writeFile(path.join(outputDirectory, "index.html"), indexPage(guides), "utf8");
for (const guide of guides) {
  const directory = path.join(outputDirectory, guide.metadata.slug);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "index.html"), guidePage(guide, guides), "utf8");
}

process.stdout.write(`Generated ${guides.length} static guide pages.\n`);
