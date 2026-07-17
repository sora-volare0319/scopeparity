import type { Finding, ScanResult } from "./types.js";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function findingHtml(item: Finding): string {
  const evidence = item.evidence.length
    ? `<ul>${item.evidence.map((value) => `<li><code>${escapeHtml(value)}</code></li>`).join("")}</ul>`
    : "";
  return `<article class="finding finding--${item.severity}">
    <div class="finding__meta"><span>${escapeHtml(item.severity)}</span><code>${escapeHtml(item.ruleId)}</code></div>
    <h2>${escapeHtml(item.title)}</h2>
    <p>${escapeHtml(item.message)}</p>
    ${evidence}
    <p class="action"><strong>Next:</strong> ${escapeHtml(item.remediation)}</p>
    <a href="${escapeHtml(item.sourceUrl)}" rel="noreferrer">Official source</a>
  </article>`;
}

export function renderJsonReport(result: ScanResult): string {
  return `${JSON.stringify(result, null, 2)}\n`;
}

export function renderHtmlReport(result: ScanResult): string {
  const storyboard = result.storyboard.length
    ? `<section class="storyboard"><h2>Video storyboard</h2><ol>${result.storyboard
        .map(
          (step) =>
            `<li><strong>${escapeHtml(step.title)}</strong><span>${escapeHtml(step.route)}</span><code>${escapeHtml(step.scopes.join(" · "))}</code></li>`,
        )
        .join("")}</ol></section>`
    : "";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <title>ScopeParity report ${escapeHtml(result.reportId)}</title>
  <style>
    :root{color-scheme:light;--paper:#f4f0e7;--ink:#1e2428;--rule:#c8c1b3;--blue:#2457d6;--red:#a33b2b;--amber:#8a6116;--green:#28624b}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.55 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{width:min(980px,calc(100% - 32px));margin:0 auto;padding:64px 0 96px}header{border-top:4px solid var(--ink);border-bottom:1px solid var(--rule);padding:24px 0 32px;margin-bottom:32px}.eyebrow,.finding__meta{display:flex;justify-content:space-between;gap:16px;text-transform:uppercase;letter-spacing:.08em;font-size:12px}h1{font-size:clamp(36px,7vw,72px);line-height:.98;max-width:12ch;margin:28px 0 20px}.summary{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid var(--rule);margin-top:32px}.summary div{padding:18px;border-right:1px solid var(--rule)}.summary div:last-child{border:0}.summary strong{display:block;font:700 32px/1 ui-monospace,SFMono-Regular,Consolas,monospace}.summary span{font-size:13px}.findings{display:grid;gap:16px}.finding{background:#fffaf0;border:1px solid var(--rule);border-left:5px solid var(--ink);padding:24px}.finding--blocker{border-left-color:var(--red)}.finding--manual{border-left-color:var(--amber)}.finding--complete{border-left-color:var(--green)}.finding h2{font-size:22px;margin:18px 0 8px}.finding p{max-width:76ch}.finding ul{padding-left:20px}code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;overflow-wrap:anywhere}.action{border-top:1px solid var(--rule);padding-top:14px}.finding a{color:var(--blue)}.storyboard{border-top:1px solid var(--rule);margin-top:48px;padding-top:24px}.storyboard li{display:grid;grid-template-columns:1fr auto;gap:4px 24px;border-bottom:1px solid var(--rule);padding:16px 0}.storyboard code{grid-column:1/-1}@media(max-width:620px){main{padding-top:32px}.summary{grid-template-columns:1fr}.summary div{border-right:0;border-bottom:1px solid var(--rule)}.storyboard li{grid-template-columns:1fr}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}
  </style>
</head>
<body>
<main>
  <header>
    <div class="eyebrow"><strong>ScopeParity · local technical evidence</strong><span>${escapeHtml(result.rulesetVersion)}</span></div>
    <h1>${result.stoppedAtRestrictedScopeBoundary ? "Assessment boundary reached." : result.summary.blockers > 0 ? "Technical story has drift." : "Evidence surfaces are in parity."}</h1>
    <p>Report ${escapeHtml(result.reportId)} · ${escapeHtml(result.manifestPath)} · ${result.scannedFiles} tracked files. This is not an approval or compliance certificate.</p>
    <div class="summary">
      <div><strong>${result.summary.blockers}</strong><span>must fix</span></div>
      <div><strong>${result.summary.manual}</strong><span>confirm manually</span></div>
      <div><strong>${result.summary.complete}</strong><span>evidence complete</span></div>
    </div>
  </header>
  <section class="findings" aria-label="Findings">${result.findings.map(findingHtml).join("\n")}</section>
  ${storyboard}
</main>
</body>
</html>\n`;
}

export { escapeHtml };
