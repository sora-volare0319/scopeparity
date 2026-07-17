import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { marked } from "marked";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const siteDirectory = path.resolve(scriptDirectory, "..");
const contentDirectory = path.resolve(siteDirectory, "../../content");
const outputDirectory = path.join(siteDirectory, "public", "guides");
const privacyOutputDirectory = path.join(siteDirectory, "public", "privacy");
const examplesOutputDirectory = path.join(siteDirectory, "public", "examples");
const examplesContractPath = path.join(contentDirectory, "public-examples.json");
const sitemapOutputPath = path.join(siteDirectory, "public", "sitemap.xml");
const siteOrigin = "https://scopeparity.vercel.app";
const exampleSourceRef = "v0.1.4";
const defaultCliPrefix = "npx -y github:sora-volare0319/scopeparity-cli#v0.1.4";
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

function analyticsMarkup() {
  const rawConfig = process.env.VERCEL_OBSERVABILITY_CLIENT_CONFIG;
  if (!rawConfig) return "";

  try {
    const scriptSrc = JSON.parse(rawConfig)?.analytics?.scriptSrc;
    if (typeof scriptSrc !== "string") return "";
    const scriptUrl = new URL(scriptSrc, siteOrigin);
    if (scriptUrl.origin !== siteOrigin || !scriptUrl.pathname.endsWith("/script.js")) return "";
    const safeSrc = `${scriptUrl.pathname}${scriptUrl.search}`;
    return `<script src="/analytics-init.js"></script><script defer src="${escapeHtml(safeSrc)}"></script>`;
  } catch {
    return "";
  }
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
  for (const key of ["title", "description", "intent", "slug", "published", "updated"]) {
    if (!metadata[key]) throw new Error(`Missing ${key} frontmatter: ${filename}`);
  }
  if (!/^[a-z0-9-]+$/u.test(metadata.slug)) throw new Error(`Unsafe guide slug: ${metadata.slug}`);
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(metadata.published)) throw new Error(`Invalid published date: ${filename}`);
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(metadata.updated)) throw new Error(`Invalid updated date: ${filename}`);
  if (metadata.updated < metadata.published) throw new Error(`Updated date precedes publication: ${filename}`);
  return { metadata, body: source.slice(match[0].length) };
}

function formatReviewDate(value) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

const guideCss = `
:root{color-scheme:light;--paper:#f2eee5;--ink:#1d2528;--muted:#64645f;--rule:#c7c0b3;--cobalt:#2b55cc;--coral:#a74432}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.68 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}a{color:var(--cobalt);text-underline-offset:.18em}a:focus-visible{outline:3px solid var(--cobalt);outline-offset:4px}.shell{width:min(1120px,calc(100% - 36px));margin:0 auto}.site-head{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--rule);padding:18px 0;font-size:13px}.brand{display:flex;align-items:center;gap:9px;color:var(--ink);font-weight:720;text-decoration:none}.brand-mark{display:grid;place-items:center;width:23px;height:23px;border:1px solid var(--ink);font:700 11px/1 ui-monospace,monospace}.site-head nav{display:flex;gap:22px}.site-head nav a{color:var(--ink)}main{display:grid;grid-template-columns:minmax(0,720px) 1fr;gap:clamp(40px,8vw,110px);padding:64px 0 100px}.article,.rail{min-width:0}.article-head{border-top:4px solid var(--ink);padding-top:24px;margin-bottom:42px}.eyebrow{color:var(--coral);font:700 11px/1.2 ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase}.article-head h1{font-size:clamp(42px,7vw,76px);line-height:.96;letter-spacing:-.055em;margin:24px 0;max-width:13ch}.lede{font-size:19px;color:var(--muted);max-width:58ch}.article h2{font-size:30px;line-height:1.1;letter-spacing:-.03em;margin:58px 0 14px;padding-top:22px;border-top:1px solid var(--rule)}.article h3{font-size:20px;margin-top:34px}.article p,.article li{max-width:68ch}.article li+li{margin-top:8px}.article table{display:block;max-width:100%;overflow:auto;border-collapse:collapse;font-size:14px}.article th,.article td{min-width:12rem;padding:10px 12px;border:1px solid var(--rule);text-align:left;vertical-align:top}.article pre{max-width:100%;overflow:auto;background:#20292c;color:#f6f0e5;border-left:5px solid var(--coral);padding:18px 20px;margin:28px 0}.article code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:.9em;overflow-wrap:anywhere}.article :not(pre)>code{background:#e6dfd1;padding:.1em .34em}.rail{align-self:start;position:sticky;top:24px;border-top:1px solid var(--ink);padding-top:18px}.rail strong{display:block;font-size:13px}.rail p{font-size:13px;color:var(--muted)}.command{display:block;background:#20292c;color:#f6f0e5;padding:14px;margin:18px 0;font-size:12px;overflow-wrap:anywhere}.rail a.cta{display:inline-flex;background:var(--ink);color:#fff;padding:12px 15px;text-decoration:none;font-weight:700}.related{border-top:1px solid var(--rule);margin-top:64px;padding-top:24px}.related ul{padding:0;list-style:none}.related a{display:block;border-bottom:1px solid var(--rule);padding:12px 0}.site-foot{border-top:1px solid var(--rule);padding:24px 0 50px;color:var(--muted);font-size:12px}@media(max-width:800px){main{grid-template-columns:1fr;padding-top:38px}.rail{position:static}.article-head h1{font-size:46px}.site-head nav a:first-child{display:none}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
`;

const templateAccessibilityCss = `
.skip-link{position:absolute;left:18px;top:-80px;z-index:10;background:var(--ink);color:#fff;padding:10px 14px;text-decoration:none}.skip-link:focus{top:12px}.site-head{flex-wrap:wrap;gap:12px}.site-head nav{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:10px 18px}@media(max-width:800px){.site-head nav a:first-child{display:inline}}
`;

const exampleIndexLayoutCss = `
.examples{min-width:0}.example-command{width:100%;min-width:0}.examples ul{display:block;margin:52px 0}.examples li{border-top:1px solid var(--rule)}.examples li:last-child{border-bottom:1px solid var(--rule)}.examples li a{display:grid;grid-template-columns:minmax(0,.78fr) minmax(0,1.22fr);gap:12px 28px;border:0;padding:26px 0}.examples li .eyebrow{grid-column:1}.examples li strong{grid-column:1;margin:0}.examples li p{grid-column:2;grid-row:1/span 2;margin:0}.examples li small{grid-column:1/-1;margin-top:4px;padding-top:14px;border-top:1px solid var(--rule)}@media(max-width:700px){.examples li a{grid-template-columns:minmax(0,1fr)}.examples li .eyebrow,.examples li strong,.examples li p,.examples li small{grid-column:1;grid-row:auto}}
`;

function addStaticTemplateAccessibility(html, extraCss = "") {
  let output = html.replace("</style>", `${templateAccessibilityCss}${extraCss}</style>`);
  output = output.replace('<body><div class="shell">', '<body><a class="skip-link" href="#main-content">Skip to content</a><div class="shell">');
  output = output.replace("<main>", '<main id="main-content">');
  if (!output.includes('href="/examples/"')) {
    output = output.replace(
      '<a href="/guides/">Guides</a>',
      '<a href="/guides/">Guides</a><a href="/examples/">Examples</a>',
    );
  }
  output = output.replaceAll(
    "git clone --depth 1 https://github.com/sora-volare0319/scopeparity.git",
    `git clone --depth 1 --branch ${exampleSourceRef} https://github.com/sora-volare0319/scopeparity.git`,
  );
  return output;
}

function guidePage(guide, allGuides) {
  const { metadata, body } = guide;
  const pageUrl = `${siteOrigin}/guides/${metadata.slug}/`;
  const normalizedBody = body.replace(/^(\s*)#\s+/u, "$1## ");
  const article = marked
    .parse(
      normalizedBody
        .replaceAll(defaultCliPrefix, cliPrefix)
        .replaceAll("npx scopeparity", cliPrefix),
      { gfm: true },
    )
    .replaceAll("<pre>", '<pre tabindex="0">')
    .replaceAll("<table>", '<table tabindex="0">');
  const related = allGuides
    .filter((candidate) => candidate.metadata.slug !== metadata.slug)
    .slice(0, 3)
    .map(
      (candidate) =>
        `<li><a href="/guides/${escapeHtml(candidate.metadata.slug)}/">${escapeHtml(candidate.metadata.title)}</a></li>`,
    )
    .join("");
  return `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${escapeHtml(metadata.description)}"><meta name="robots" content="index,follow"><link rel="canonical" href="${escapeHtml(pageUrl)}"><meta property="og:type" content="article"><meta property="og:url" content="${escapeHtml(pageUrl)}"><meta property="og:title" content="${escapeHtml(metadata.title)}"><meta property="og:description" content="${escapeHtml(metadata.description)}"><meta property="og:image" content="${siteOrigin}/og.png"><meta property="article:modified_time" content="${escapeHtml(metadata.updated)}"><meta name="twitter:card" content="summary_large_image"><title>${escapeHtml(metadata.title)} · ScopeParity</title><style>${guideCss}${templateAccessibilityCss}.article-meta{color:var(--muted);font-size:13px;margin-top:18px}</style>${analyticsMarkup()}</head>
<body><a class="skip-link" href="#main-content">Skip to content</a><div class="shell"><header class="site-head"><a class="brand" href="/"><span class="brand-mark">SP</span>ScopeParity</a><nav aria-label="Guide navigation"><a href="/guides/">Guides</a><a href="/examples/">Examples</a><a href="/#sample">Sample report</a><a href="/#pricing">Pricing</a></nav></header>
<main id="main-content"><article class="article" itemscope itemtype="https://schema.org/TechArticle"><link itemprop="mainEntityOfPage" href="${escapeHtml(pageUrl)}"><meta itemprop="datePublished" content="${escapeHtml(metadata.published)}"><header class="article-head"><span class="eyebrow">Technical guide · Google OAuth launch review</span><h1 itemprop="headline">${escapeHtml(metadata.title)}</h1><p class="lede" itemprop="description">${escapeHtml(metadata.description)}</p><p class="article-meta">Published <time datetime="${escapeHtml(metadata.published)}">${escapeHtml(formatReviewDate(metadata.published))}</time> · sources reviewed <time itemprop="dateModified" datetime="${escapeHtml(metadata.updated)}">${escapeHtml(formatReviewDate(metadata.updated))}</time> by <span itemprop="author" itemscope itemtype="https://schema.org/Organization"><a itemprop="url" href="/"><span itemprop="name">ScopeParity maintainers</span></a></span></p></header><div itemprop="articleBody">${article}</div><aside class="related"><h2>Related diagnostics</h2><ul>${related}</ul></aside></article>
<aside class="rail" aria-label="Run ScopeParity"><strong>Compare the evidence locally</strong><p>Tracked files only. No Google credentials. No source upload.</p><code class="command">${escapeHtml(`${cliPrefix} scan .`)}</code><a class="cta" href="/#cli">See the local workflow</a><p>ScopeParity finds technical inconsistencies. It does not predict or guarantee approval.</p></aside></main>
<footer class="site-foot">ScopeParity is an independent developer tool and is not affiliated with Google. <a href="/privacy/">Privacy</a></footer></div></body></html>`;
}

function indexPage(guides) {
  const rows = guides
    .map(
      ({ metadata }) =>
        `<li><a href="/guides/${escapeHtml(metadata.slug)}/"><strong>${escapeHtml(metadata.title)}</strong><span>${escapeHtml(metadata.description)}</span></a></li>`,
    )
    .join("");
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Technical diagnostics for Google OAuth launch scope drift, public identity, and demonstration evidence."><meta name="robots" content="index,follow"><link rel="canonical" href="${siteOrigin}/guides/"><meta property="og:type" content="website"><meta property="og:url" content="${siteOrigin}/guides/"><meta property="og:title" content="Google OAuth launch diagnostics · ScopeParity"><meta property="og:description" content="Technical diagnostics for launch scope drift, public identity, and demonstration evidence."><meta property="og:image" content="${siteOrigin}/og.png"><meta name="twitter:card" content="summary_large_image"><title>Google OAuth launch diagnostics · ScopeParity</title><style>${guideCss}${templateAccessibilityCss}.guide-index{grid-column:1/-1}.guide-index h1{font-size:clamp(48px,9vw,96px);line-height:.9;letter-spacing:-.06em;max-width:10ch}.guide-index ul{list-style:none;padding:0;margin-top:54px}.guide-index li{border-top:1px solid var(--rule)}.guide-index li:last-child{border-bottom:1px solid var(--rule)}.guide-index li a{display:grid;grid-template-columns:1fr 1fr;gap:28px;color:var(--ink);padding:24px 0;text-decoration:none}.guide-index span{color:var(--muted)}@media(max-width:700px){.guide-index li a{grid-template-columns:1fr}}</style>${analyticsMarkup()}</head><body><a class="skip-link" href="#main-content">Skip to content</a><div class="shell"><header class="site-head"><a class="brand" href="/"><span class="brand-mark">SP</span>ScopeParity</a><nav aria-label="Guide navigation"><a href="/examples/">Examples</a><a href="/#sample">Sample report</a><a href="/#pricing">Pricing</a></nav></header><main id="main-content"><section class="guide-index"><span class="eyebrow">Field notes / exact failure modes</span><h1>Google OAuth launch diagnostics.</h1><p class="lede">Technical steps for the mismatches software can prove—and a clear boundary around what still requires reviewer judgment.</p><ul>${rows}</ul></section></main><footer class="site-foot">ScopeParity is an independent developer tool and is not affiliated with Google. <a href="/privacy/">Privacy</a></footer></div></body></html>`;
}

function privacyPage() {
  const pageUrl = `${siteOrigin}/privacy/`;
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="How ScopeParity handles website analytics, local scan data, and checkout data."><meta name="robots" content="index,follow"><link rel="canonical" href="${pageUrl}"><meta property="og:type" content="website"><meta property="og:url" content="${pageUrl}"><meta property="og:title" content="Privacy · ScopeParity"><meta property="og:description" content="A surface-by-surface account of what ScopeParity collects and what stays local."><meta property="og:image" content="${siteOrigin}/og.png"><meta name="twitter:card" content="summary_large_image"><title>Privacy · ScopeParity</title><style>${guideCss}.privacy{grid-column:1/-1;max-width:760px}.privacy h1{font-size:clamp(48px,9vw,96px);line-height:.9;letter-spacing:-.06em;max-width:9ch}.privacy h2{font-size:30px;line-height:1.1;letter-spacing:-.03em;margin:58px 0 14px;padding-top:22px;border-top:1px solid var(--rule)}.privacy p,.privacy li{max-width:68ch}</style>${analyticsMarkup()}</head><body><div class="shell"><header class="site-head"><a class="brand" href="/"><span class="brand-mark">SP</span>ScopeParity</a><nav aria-label="Privacy navigation"><a href="/guides/">Guides</a><a href="/#pricing">Pricing</a></nav></header><main><article class="privacy"><span class="eyebrow">Operational disclosure · reviewed 18 July 2026</span><h1>Privacy, by surface.</h1><p class="lede">The website, free scanner, and paid compiler have different data boundaries. This page states each one directly.</p><h2>Website analytics</h2><p>ScopeParity uses Vercel Web Analytics for aggregated page views, routes, referrers, approximate country, device type, operating system, and browser. It does not use analytics cookies or store an email address, repository identity, or cross-site identifier. Vercel says its temporary visitor hash is discarded after 24 hours. See <a href="https://vercel.com/docs/analytics/privacy-policy">Vercel's analytics privacy documentation</a>.</p><h2>Free scanner</h2><p>The CLI is telemetry-free. A normal scan reads allowed Git-tracked files and the manifest on your device and writes output locally. It sends no source, manifest, report, client ID, token, or credential to ScopeParity. The optional <code>--check-urls</code> flag requests only the public HTTPS URLs you explicitly placed in the manifest.</p><h2>Public GitHub feedback</h2><p>The optional scan-outcome and purchase-interest links open a public GitHub issue tied to your GitHub account. The forms collect only coarse selected answers and have no free-text field. Do not include project details, URLs, identifiers, files, output, correspondence, credentials, or personal data. A purchase-interest issue is not a reservation, payment, or sale.</p><h2>Launch Evidence Workspace</h2><p>The paid compiler has no telemetry or online license check. It reads only the JSON report and matching secret-free manifest you supply, and writes the workspace locally. It does not read repository source.</p><h2>Checkout</h2><p>Checkout is not live and ScopeParity currently collects no payment or purchaser data. Before payment is enabled, the hosted Merchant of Record and its data-handling terms will be named at the purchase link.</p><h2>Boundary</h2><p>Do not put credentials, tokens, client secrets, service-account data, personal user data, or unpublished source into the manifest. ScopeParity is an independent developer tool and is not affiliated with Google.</p></article></main><footer class="site-foot"><a href="/">ScopeParity</a> · Technical parity before launch.</footer></div></body></html>`;
}

function exampleFindingList(report) {
  return report.findings
    .map(
      (finding) =>
        `<li class="rule rule--${escapeHtml(finding.severity)}"><span>${escapeHtml(finding.severity)}</span><code>${escapeHtml(finding.ruleId)}</code></li>`,
    )
    .join("");
}

function exampleIndexPage(exampleCases) {
  const cards = exampleCases
    .map(
      (exampleCase) =>
        `<li><a href="/examples/${escapeHtml(exampleCase.slug)}/"><span class="eyebrow">${escapeHtml(exampleCase.eyebrow)}</span><strong>${escapeHtml(exampleCase.title)}</strong><p>${escapeHtml(exampleCase.description)}</p><small>${escapeHtml(exampleCase.beforeLabel)} → ${escapeHtml(exampleCase.afterLabel)}</small></a></li>`,
    )
    .join("");
  const pageUrl = `${siteOrigin}/examples/`;
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Three deterministic, synthetic Google OAuth launch fixtures with before and after ScopeParity reports."><meta name="robots" content="index,follow"><link rel="canonical" href="${pageUrl}"><meta property="og:type" content="website"><meta property="og:url" content="${pageUrl}"><meta property="og:title" content="Google OAuth launch evidence examples · ScopeParity"><meta property="og:description" content="Inspect the exact inputs and deterministic reports before running ScopeParity on your own repository."><meta property="og:image" content="${siteOrigin}/og.png"><meta name="twitter:card" content="summary_large_image"><title>Google OAuth launch evidence examples · ScopeParity</title><style>${guideCss}.examples{grid-column:1/-1}.examples h1{font-size:clamp(48px,9vw,96px);line-height:.9;letter-spacing:-.06em;max-width:11ch}.examples>p{max-width:66ch}.examples ul{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;list-style:none;padding:0;margin:52px 0}.examples li{min-width:0}.examples li a{display:flex;min-height:100%;flex-direction:column;border:1px solid var(--rule);padding:24px;color:var(--ink);text-decoration:none}.examples li strong{font-size:24px;line-height:1.08;margin:20px 0 12px}.examples li p{color:var(--muted)}.examples li small{margin-top:auto;padding-top:22px;border-top:1px solid var(--rule)}.example-command{max-width:760px;background:#20292c;color:#f6f0e5;padding:18px;overflow:auto}@media(max-width:820px){.examples ul{grid-template-columns:1fr}}</style>${analyticsMarkup()}</head><body><div class="shell"><header class="site-head"><a class="brand" href="/"><span class="brand-mark">SP</span>ScopeParity</a><nav aria-label="Example navigation"><a href="/guides/">Guides</a><a href="/#pricing">Pricing</a></nav></header><main><section class="examples"><span class="eyebrow">Reproducible / synthetic / current ruleset</span><h1>See the difference before running the scan.</h1><p class="lede">Each pair is generated from a tiny Git-tracked project by the same deterministic engine shipped in the CLI. Inspect the source, manifest, JSON, and HTML report. No Google account or credential is involved.</p><ul>${cards}</ul><h2>Run one locally</h2><pre class="example-command" tabindex="0"><code>git clone --depth 1 https://github.com/sora-volare0319/scopeparity.git
${escapeHtml(`${cliPrefix} scan scopeparity/fixtures/public-examples/scope-drift/before --manifest oauth-evidence.yaml`)}</code></pre><p>Zero fixture blockers means only that the bounded technical differences shown here were resolved. It does not establish completed verification, policy sufficiency, domain ownership, or Google approval.</p></section></main><footer class="site-foot">ScopeParity is an independent developer tool and is not affiliated with Google. <a href="/privacy/">Privacy</a></footer></div></body></html>`;
}

function pinExampleIndexCopy(html, rulesetVersion) {
  return html
    .replace(
      "Reproducible / synthetic / current ruleset",
      `Reproducible / synthetic / pinned ruleset ${escapeHtml(rulesetVersion)}`,
    )
    .replace(
      "<p>Zero fixture blockers means only",
      "<p>Finding order, rule IDs, counts, and report IDs are deterministic for these pinned inputs and ruleset. A local run records its actual run time; the published JSON pins <code>generatedAt</code> only to keep snapshot diffs stable.</p><p>Zero fixture blockers means only",
    );
}

function exampleCasePage(exampleCase, beforeReport, afterReport) {
  const pageUrl = `${siteOrigin}/examples/${exampleCase.slug}/`;
  const artifactLinks = (phase) => {
    const label = phase === "before" ? "Before" : "After";
    return `<a href="${phase}.html">${label} HTML report</a><a href="${phase}.json">${label} JSON report</a><a href="${phase}-oauth-evidence.yaml">${label} manifest</a><a href="${phase}-auth.ts.txt">${label} source</a>`;
  };
  const scanCommand = (phase) =>
    `${cliPrefix} scan scopeparity/fixtures/public-examples/${exampleCase.slug}/${phase} --manifest oauth-evidence.yaml --report ${exampleCase.slug}-${phase}.html`;
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${escapeHtml(exampleCase.description)}"><meta name="robots" content="index,follow"><link rel="canonical" href="${pageUrl}"><meta property="og:type" content="article"><meta property="og:url" content="${pageUrl}"><meta property="og:title" content="${escapeHtml(exampleCase.seoTitle)}"><meta property="og:description" content="${escapeHtml(exampleCase.description)}"><meta property="og:image" content="${siteOrigin}/og.png"><meta name="twitter:card" content="summary_large_image"><title>${escapeHtml(exampleCase.seoTitle)} · ScopeParity</title><style>${guideCss}.example{grid-column:1/-1}.example-head{border-top:4px solid var(--ink);padding-top:24px}.example h1{font-size:clamp(44px,8vw,82px);line-height:.94;letter-spacing:-.055em;max-width:13ch}.example-head p{max-width:62ch}.pair{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:54px 0}.state{display:flex;min-width:0;flex-direction:column;border:1px solid var(--rule);padding:24px}.state--before{border-top:5px solid var(--coral)}.state--after{border-top:5px solid #28624b}.state h2{font-size:30px;line-height:1.05;margin:12px 0}.state-summary{color:var(--muted)}.rules{list-style:none;padding:0;margin:24px 0}.rule{display:grid;grid-template-columns:7rem minmax(0,1fr);gap:10px;border-top:1px solid var(--rule);padding:10px 0;font-size:12px}.rule span{text-transform:uppercase}.rule code{overflow-wrap:anywhere}.rule--blocker span{color:var(--coral)}.rule--complete span{color:#28624b}.artifacts{display:flex;flex-wrap:wrap;gap:12px;margin-top:auto}.repair,.reproduce{border-top:1px solid var(--rule);padding-top:24px;margin-top:48px}.repair p,.reproduce p{max-width:68ch}.commands{display:grid;gap:12px}.commands pre{max-width:100%;margin:0;background:#20292c;color:#f6f0e5;padding:18px;overflow:auto}.feedback{display:inline-flex;margin-top:22px;background:var(--ink);color:#fff;padding:12px 15px;text-decoration:none;font-weight:700}@media(max-width:800px){.pair{grid-template-columns:1fr}.rule{grid-template-columns:5.5rem minmax(0,1fr)}}</style>${analyticsMarkup()}</head><body><div class="shell"><header class="site-head"><a class="brand" href="/"><span class="brand-mark">SP</span>ScopeParity</a><nav aria-label="Example navigation"><a href="/examples/">Examples</a><a href="/guides/">Guides</a><a href="/#pricing">Pricing</a></nav></header><main><article class="example"><header class="example-head"><span class="eyebrow">${escapeHtml(exampleCase.eyebrow)} · synthetic fixture</span><h1>${escapeHtml(exampleCase.title)}</h1><p class="lede">${escapeHtml(exampleCase.description)}</p></header><section class="pair" aria-label="Before and after reports"><article class="state state--before"><span class="eyebrow">Before · ${beforeReport.summary.blockers} must fix</span><h2>${escapeHtml(exampleCase.beforeLabel)}</h2><p class="state-summary">Report ${escapeHtml(beforeReport.reportId)} · ruleset ${escapeHtml(beforeReport.rulesetVersion)}</p><ul class="rules">${exampleFindingList(beforeReport)}</ul><div class="artifacts">${artifactLinks("before")}</div></article><article class="state state--after"><span class="eyebrow">After · ${afterReport.summary.blockers} must fix</span><h2>${escapeHtml(exampleCase.afterLabel)}</h2><p class="state-summary">Report ${escapeHtml(afterReport.reportId)} · same bounded scanner</p><ul class="rules">${exampleFindingList(afterReport)}</ul><div class="artifacts">${artifactLinks("after")}</div></article></section><section class="repair"><span class="eyebrow">What changed</span><h2>One bounded repair, shown in the inputs.</h2><p>${escapeHtml(exampleCase.repair)}</p><p>The after report has zero objective inconsistencies for this fixture. The video remains unrecorded, public URL fetching is off, and no Google Cloud or Search Console state was inspected.</p><p><a href="${escapeHtml(exampleCase.guidePath)}">${escapeHtml(exampleCase.guideLabel)}</a> for the corresponding diagnostic path and official sources.</p></section><section class="reproduce"><span class="eyebrow">Reproduce locally</span><h2>Run both snapshots with no account.</h2><div class="commands"><pre tabindex="0"><code>git clone --depth 1 https://github.com/sora-volare0319/scopeparity.git</code></pre><pre tabindex="0"><code>${escapeHtml(scanCommand("before"))}</code></pre><pre tabindex="0"><code>${escapeHtml(scanCommand("after"))}</code></pre></div><p>These are intentionally public synthetic inputs. Never put credentials, tokens, private source, or personal data into a manifest or public feedback issue.</p><p>When you are ready, run <code>init</code> and <code>scan</code> on your own Git repository. The CLI then shows the optional coarse feedback route.</p><a class="feedback" href="/#cli">Run ScopeParity on your repository</a></section></article></main><footer class="site-foot">A passing fixture is not an approval or compliance claim. <a href="/privacy/">Privacy</a></footer></div></body></html>`;
}

function addExampleCaseSnapshotDisclosure(html) {
  return html.replace(
    "<p>These are intentionally public synthetic inputs.",
    "<p>Rule IDs, counts, order, and report IDs reproduce from the pinned inputs and ruleset. Your local <code>generatedAt</code> records the actual run time; this published snapshot pins that field for stable diffs.</p><p>These are intentionally public synthetic inputs.",
  );
}

function sitemapPage(guides, exampleCases, examplesUpdated) {
  const latestUpdate = guides.reduce(
    (latest, guide) => (guide.metadata.updated > latest ? guide.metadata.updated : latest),
    "2026-07-18",
  );
  const routes = [
    { route: "/", updated: "2026-07-18" },
    { route: "/guides/", updated: latestUpdate },
    ...guides.map(({ metadata }) => ({ route: `/guides/${metadata.slug}/`, updated: metadata.updated })),
    { route: "/examples/", updated: examplesUpdated },
    ...exampleCases.map(({ slug }) => ({ route: `/examples/${slug}/`, updated: examplesUpdated })),
    { route: "/privacy/", updated: "2026-07-18" },
    { route: "/pricing.md", updated: "2026-07-18" },
  ];
  const urls = routes
    .map(({ route, updated }) => `  <url><loc>${siteOrigin}${route}</loc><lastmod>${updated}</lastmod></url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

const filenames = (await readdir(contentDirectory))
  .filter((filename) => filename.endsWith(".md"))
  .sort((left, right) => left.localeCompare(right, "en"));
const guides = await Promise.all(
  filenames.map(async (filename) =>
    parseFrontmatter(await readFile(path.join(contentDirectory, filename), "utf8"), filename),
  ),
);
guides.sort((a, b) => a.metadata.title.localeCompare(b.metadata.title));
const examplesContract = JSON.parse(await readFile(examplesContractPath, "utf8"));
const examplesUpdated = examplesContract.snapshotAt?.slice(0, 10);
if (!/^\d{4}-\d{2}-\d{2}$/u.test(examplesUpdated) || !Array.isArray(examplesContract.cases)) {
  throw new Error("Invalid public-examples.json contract");
}
for (const exampleCase of examplesContract.cases) {
  if (!/^[a-z0-9-]+$/u.test(exampleCase.slug)) throw new Error(`Unsafe example slug: ${exampleCase.slug}`);
}

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await rm(privacyOutputDirectory, { recursive: true, force: true });
await mkdir(privacyOutputDirectory, { recursive: true });
await mkdir(examplesOutputDirectory, { recursive: true });
await writeFile(path.join(outputDirectory, "index.html"), indexPage(guides), "utf8");
await writeFile(
  path.join(privacyOutputDirectory, "index.html"),
  addStaticTemplateAccessibility(privacyPage()),
  "utf8",
);
await writeFile(
  path.join(examplesOutputDirectory, "index.html"),
  addStaticTemplateAccessibility(
    pinExampleIndexCopy(exampleIndexPage(examplesContract.cases), examplesContract.rulesetVersion),
    exampleIndexLayoutCss,
  ),
  "utf8",
);
await writeFile(sitemapOutputPath, sitemapPage(guides, examplesContract.cases, examplesUpdated), "utf8");
for (const guide of guides) {
  const directory = path.join(outputDirectory, guide.metadata.slug);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "index.html"), guidePage(guide, guides), "utf8");
}
for (const exampleCase of examplesContract.cases) {
  const directory = path.join(examplesOutputDirectory, exampleCase.slug);
  const beforeReport = JSON.parse(await readFile(path.join(directory, "before.json"), "utf8"));
  const afterReport = JSON.parse(await readFile(path.join(directory, "after.json"), "utf8"));
  await writeFile(
    path.join(directory, "index.html"),
    addStaticTemplateAccessibility(
      addExampleCaseSnapshotDisclosure(exampleCasePage(exampleCase, beforeReport, afterReport)),
    ),
    "utf8",
  );
}

process.stdout.write(
  `Generated ${guides.length} static guide pages, ${examplesContract.cases.length} public example pages, and the privacy disclosure.\n`,
);
