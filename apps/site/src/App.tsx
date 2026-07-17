import { useEffect, useId, useState } from "react";

const DEFAULT_CLI_PREFIX = "npx -y github:sora-volare0319/scopeparity-cli#v0.1.0";

function configuredCliPrefix(value: string | undefined): string {
  const prefix = value?.trim() ?? "";
  return prefix && prefix.length <= 300 && !/[\u0000-\u001f\u007f-\u009f]/u.test(prefix)
    ? prefix
    : DEFAULT_CLI_PREFIX;
}

const CLI_PREFIX = configuredCliPrefix(import.meta.env.VITE_CLI_PREFIX);
const CLI_INIT_COMMAND = `${CLI_PREFIX} init .`;
const CLI_SCAN_COMMAND = `${CLI_PREFIX} scan . --manifest oauth-evidence.yaml`;

function hostedCheckoutUrl(value: string | undefined): string {
  if (!value) return "";

  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

const LEGACY_CHECKOUT_URL = hostedCheckoutUrl(import.meta.env.VITE_CHECKOUT_URL);
const RESERVATION_CHECKOUT_URL = hostedCheckoutUrl(import.meta.env.VITE_RESERVATION_CHECKOUT_URL);
const EVIDENCE_CHECKOUT_URL =
  hostedCheckoutUrl(import.meta.env.VITE_EVIDENCE_CHECKOUT_URL) || LEGACY_CHECKOUT_URL;

type FindingTone = "blocker" | "manual" | "complete";

type Finding = {
  id: string;
  rule: string;
  tone: FindingTone;
  eyebrow: string;
  title: string;
  summary: string;
  codeValue: string;
  manifestValue: string;
  action: string;
  reference: string;
};

type Scenario = "drift" | "aligned";

const sampleFindings: Record<Scenario, readonly Finding[]> = {
  drift: [
    {
      id: "scope-drift",
      rule: "SCOPE_IN_CODE_NOT_DECLARED",
      tone: "blocker",
      eyebrow: "Must fix · Source ↔ manifest",
      title: "Calendar write scope ships in code, but is absent from the launch manifest.",
      summary:
        "The production authorization request contains calendar.events. The secret-free manifest only declares calendar.readonly.",
      codeValue: "…/auth/calendar.events · src/auth/google.ts:42",
      manifestValue: "…/auth/calendar.readonly · oauth-evidence.yaml:18",
      action:
        "Choose the scope the feature actually needs, then make the source request and consent-screen declaration match.",
      reference: "Google: Sensitive scope verification",
    },
    {
      id: "redirect-drift",
      rule: "REDIRECT_HOST_NOT_AUTHORIZED",
      tone: "blocker",
      eyebrow: "Must fix · Manifest ↔ public identity",
      title: "A release callback uses a host that is not listed as an authorized domain.",
      summary:
        "The manifest records preview.northstar.example as a callback host, while only northstar.example is declared as authorized.",
      codeValue: "https://preview.northstar.example/oauth/callback",
      manifestValue: "authorized_domains: [northstar.example]",
      action:
        "Remove the preview callback from the production launch path, or declare the host in the configuration you intend to submit.",
      reference: "Google: Authorized domains",
    },
    {
      id: "video-gap",
      rule: "VIDEO_STEP_MISSING_FOR_SCOPE",
      tone: "manual",
      eyebrow: "Confirm manually · Manifest ↔ evidence",
      title: "The recording plan never demonstrates the Calendar write action.",
      summary:
        "The storyboard shows account connection and calendar reading, but it has no shot for the feature that creates an event.",
      codeValue: "feature: Create a planning event",
      manifestValue: "video_step: —",
      action:
        "Add one recording step that visibly invokes the feature and shows the matching consent-screen scope in English.",
      reference: "Google: Demo video guidance",
    },
  ],
  aligned: [
    {
      id: "scope-aligned",
      rule: "SCOPE_SET_IN_PARITY",
      tone: "complete",
      eyebrow: "Evidence complete · Source ↔ manifest",
      title: "Both requested scopes are represented in the launch manifest.",
      summary:
        "The source inventory and declared launch scope set contain the same normalized values. No extra scope was inferred.",
      codeValue: "calendar.readonly · userinfo.email",
      manifestValue: "calendar.readonly · userinfo.email",
      action: "Keep this contract in CI so a later source change produces a reviewable diff.",
      reference: "ScopeParity ruleset 2026.07",
    },
    {
      id: "evidence-aligned",
      rule: "SCOPE_EVIDENCE_TRACE_COMPLETE",
      tone: "complete",
      eyebrow: "Evidence complete · Manifest ↔ storyboard",
      title: "Every declared scope maps to a feature and a recording step.",
      summary:
        "The generated storyboard has an observable product action for Calendar read access and basic account identity.",
      codeValue: "2 declared scopes · 2 product features",
      manifestValue: "2 features · 2 video steps",
      action: "Record the live product exactly as described, then attach the resulting link manually.",
      reference: "Google: Demo video guidance",
    },
    {
      id: "homepage-check",
      rule: "HOMEPAGE_PURPOSE_CONFIRM_MANUALLY",
      tone: "manual",
      eyebrow: "Confirm manually · Public identity",
      title: "Homepage purpose remains a human-review item.",
      summary:
        "ScopeParity found the app name and privacy link. It does not decide whether the product description is sufficient for a reviewer.",
      codeValue: "app_name: Northstar Notes",
      manifestValue: "homepage checks: name ✓ · privacy link ✓",
      action: "Read the public page as a first-time user and confirm it accurately explains the product.",
      reference: "Google: Homepage requirements",
    },
  ],
};

const toneLabels: Record<FindingTone, string> = {
  blocker: "Must fix",
  manual: "Confirm",
  complete: "Complete",
};

function MarkIcon({ tone = "complete" }: { tone?: FindingTone }) {
  if (tone === "blocker") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M5 5l10 10M15 5 5 15" />
      </svg>
    );
  }

  if (tone === "manual") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M10 4v7M10 15.25v.1" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="m4.5 10.5 3.5 3.5 7.5-8" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <path d="M3 9h11M10 4l5 5-5 5" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <rect x="6" y="5" width="8" height="9" rx="1" />
      <path d="M4 12H3.5A1.5 1.5 0 0 1 2 10.5v-7A1.5 1.5 0 0 1 3.5 2h7A1.5 1.5 0 0 1 12 3.5V4" />
    </svg>
  );
}

function CheckoutCta({ kind }: { kind: "reservation" | "evidence" }) {
  const url = kind === "reservation" ? RESERVATION_CHECKOUT_URL : EVIDENCE_CHECKOUT_URL;
  const isConfigured = url.length > 0;
  const productLabel = kind === "reservation" ? "Founding validation reservation" : "Launch Evidence Workspace";

  return (
    <a
      className={kind === "evidence" ? "pricing-row__cta" : "pricing-row__link"}
      href={isConfigured ? url : "#pricing"}
      data-event={kind === "reservation" ? "reservation_checkout_click" : "evidence_checkout_click"}
      data-checkout-state={isConfigured ? "configured" : "preview"}
      aria-label={
        isConfigured ? `Open hosted checkout for ${productLabel}` : `${productLabel} checkout preview; payments are not live`
      }
    >
      {isConfigured ? (kind === "reservation" ? "Reserve a validation place" : "Get the evidence workspace") : "Checkout preview"}
      <ArrowIcon />
    </a>
  );
}

function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 34 34" aria-hidden="true">
      <path d="M4.5 7.5v19h8M29.5 7.5v19h-8" />
      <path d="M12 12.5h10M12 17h10M12 21.5h7" />
    </svg>
  );
}

function Command({ placement }: { placement: "hero" | "footer" }) {
  const [step, setStep] = useState<"init" | "scan">("init");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "manual">("idle");
  const command = step === "init" ? CLI_INIT_COMMAND : CLI_SCAN_COMMAND;

  useEffect(() => {
    if (copyStatus === "idle") return undefined;
    const timer = window.setTimeout(() => setCopyStatus("idle"), 2400);
    return () => window.clearTimeout(timer);
  }, [copyStatus]);

  useEffect(() => {
    setCopyStatus("idle");
  }, [step]);

  const copyCommand = async () => {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(command);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("manual");
    }
  };

  const actionLabel = step === "init" ? "create manifest" : "run scan";
  const copyLabel = copyStatus === "copied"
    ? `Copied ${actionLabel} command`
    : copyStatus === "manual"
      ? "Select the command to copy it manually"
      : `Copy ${actionLabel} command`;

  return (
    <div className={`command-flow command-flow--${placement}`}>
      <div className="command-flow__steps" role="group" aria-label="Local quickstart step">
        <button type="button" aria-pressed={step === "init"} onClick={() => setStep("init")}>
          1 Create manifest
        </button>
        <button type="button" aria-pressed={step === "scan"} onClick={() => setStep("scan")}>
          2 Run scan
        </button>
      </div>
      <div className={`command command--${placement}`}>
        <span aria-hidden="true" className="command__prompt">
          $
        </span>
        <code>{command}</code>
        <button
          type="button"
          onClick={copyCommand}
          aria-label={copyLabel}
          data-event={`${placement}_${step}_copy`}
        >
          <CopyIcon />
          <span>{copyLabel}</span>
        </button>
        <span className="sr-only" aria-live="polite">
          {copyStatus === "copied" ? `${actionLabel} command copied to clipboard.` : ""}
        </span>
      </div>
      <p className="command-flow__hint">
        {step === "init"
          ? "Creates a secret-free template without overwriting an existing file. Fill it with the launch values you intend to submit."
          : "Run this after reviewing oauth-evidence.yaml. The scan stays local and reads Git-tracked files only."}
      </p>
    </div>
  );
}

function HeroReport() {
  return (
    <div className="hero-report" aria-label="Example ScopeParity launch run summary">
      <div className="hero-report__bar">
        <div className="window-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <span>launch-run / SP-104</span>
        <span className="hero-report__local">LOCAL</span>
      </div>
      <div className="hero-report__body">
        <div className="hero-report__meta">
          <span>Northstar Notes</span>
          <span>ruleset 2026.07</span>
        </div>
        <p className="hero-report__title">Technical story has drift.</p>
        <div className="hero-report__scores" aria-label="Two must fix, one confirm manually, five complete">
          <div>
            <strong>02</strong>
            <span className="signal signal--blocker">must fix</span>
          </div>
          <div>
            <strong>01</strong>
            <span className="signal signal--manual">confirm</span>
          </div>
          <div>
            <strong>05</strong>
            <span className="signal signal--complete">complete</span>
          </div>
        </div>
        <div className="hero-report__trace">
          <div>
            <span className="trace-index">01</span>
            <span>Source scopes</span>
            <strong>3</strong>
          </div>
          <div className="trace-line trace-line--broken" aria-hidden="true" />
          <div>
            <span className="trace-index">02</span>
            <span>Launch manifest</span>
            <strong>2</strong>
          </div>
          <div className="trace-line" aria-hidden="true" />
          <div>
            <span className="trace-index">03</span>
            <span>Video steps</span>
            <strong>2</strong>
          </div>
        </div>
        <div className="hero-report__finding">
          <span className="finding-mark finding-mark--blocker">
            <MarkIcon tone="blocker" />
          </span>
          <div>
            <span>SCOPE_IN_CODE_NOT_DECLARED</span>
            <p>calendar.events appears in source, not in the submitted scope set.</p>
          </div>
          <span>src/auth/google.ts:42</span>
        </div>
      </div>
      <div className="hero-report__footer">
        <span>No source lines captured</span>
        <span>No credentials requested</span>
      </div>
    </div>
  );
}

function SurfaceComparison() {
  return (
    <figure className="surface-figure" tabIndex={0} aria-label="OAuth launch surfaces comparison">
      <div className="surface-rail" aria-hidden="true">
        <span>01</span>
        <i />
        <span>02</span>
        <i className="surface-rail__mismatch" />
        <span>03</span>
      </div>
      <div className="surface-grid">
        <article className="surface surface--source">
          <header>
            <span>REPOSITORY</span>
            <strong>Source request</strong>
          </header>
          <div className="surface__code" aria-label="Source scope example">
            <span>scopes: [</span>
            <span className="code-indent">calendar.readonly,</span>
            <span className="code-indent code-alert">calendar.events,</span>
            <span className="code-indent">userinfo.email</span>
            <span>]</span>
          </div>
          <footer>
            <span>3 literal scopes</span>
            <span>tracked files only</span>
          </footer>
        </article>

        <article className="surface surface--manifest">
          <header>
            <span>SECRET-FREE YAML</span>
            <strong>Launch manifest</strong>
          </header>
          <div className="surface__code" aria-label="Launch manifest scope example">
            <span>declared_scopes:</span>
            <span className="code-indent">- calendar.readonly</span>
            <span className="code-indent code-gap"># missing write scope</span>
            <span className="code-indent">- userinfo.email</span>
            <span>authorized_domains: 1</span>
          </div>
          <footer>
            <span>2 declared scopes</span>
            <span className="surface__status surface__status--blocker">1 mismatch</span>
          </footer>
        </article>

        <article className="surface surface--evidence">
          <header>
            <span>COMPILED OUTPUT</span>
            <strong>Launch evidence</strong>
          </header>
          <div className="surface__evidence-list">
            <div>
              <MarkIcon tone="complete" />
              <span>Connect account</span>
              <small>00:00–00:21</small>
            </div>
            <div>
              <MarkIcon tone="complete" />
              <span>Read calendar</span>
              <small>00:22–00:41</small>
            </div>
            <div className="evidence-gap">
              <MarkIcon tone="manual" />
              <span>Create event</span>
              <small>step missing</small>
            </div>
          </div>
          <footer>
            <span>storyboard.html</span>
            <span>report.json</span>
          </footer>
        </article>
      </div>
      <figcaption>
        <span>One technical story, observed across three surfaces.</span>
        <span>Parity is evidence—not an approval prediction.</span>
      </figcaption>
    </figure>
  );
}

function ManifestCode({ scenario }: { scenario: Scenario }) {
  const isDrift = scenario === "drift";

  return (
    <div className="manifest-code" aria-label={`${isDrift ? "Drift detected" : "Aligned"} fictional manifest`}>
      <div className="manifest-code__bar">
        <span>oauth-evidence.yaml</span>
        <span>fictional fixture</span>
      </div>
      <pre>
        <span><i>01</i><b>app_name:</b> Northstar Notes</span>
        <span><i>02</i><b>homepage:</b> https://northstar.example</span>
        <span><i>03</i><b>authorized_domains:</b></span>
        <span><i>04</i>  - northstar.example</span>
        <span><i>05</i><b>declared_scopes:</b></span>
        <span><i>06</i>  - …/auth/calendar.readonly</span>
        <span className={isDrift ? "line--missing" : "line--added"}>
          <i>07</i>  {isDrift ? "# calendar.events is absent" : "- …/auth/userinfo.email"}
        </span>
        <span><i>08</i><b>features:</b></span>
        <span><i>09</i>  calendar_read:</span>
        <span><i>10</i>    route: /planning</span>
        <span className={isDrift ? "line--manual" : "line--added"}>
          <i>11</i>    video_step: {isDrift ? "null" : "02-read-calendar"}
        </span>
      </pre>
      <div className="manifest-code__foot">
        <span>Static demo data</span>
        <span>Nothing here is uploaded</span>
      </div>
    </div>
  );
}

function SampleReport() {
  const [scenario, setScenario] = useState<Scenario>("drift");
  const [selectedId, setSelectedId] = useState(sampleFindings.drift[0]?.id ?? "");
  const detailsId = useId();
  const findings = sampleFindings[scenario];
  const selected = findings.find((finding) => finding.id === selectedId) ?? findings[0];

  if (!selected) return null;

  const changeScenario = (nextScenario: Scenario) => {
    setScenario(nextScenario);
    const firstFinding = sampleFindings[nextScenario][0];
    if (firstFinding) setSelectedId(firstFinding.id);
  };

  return (
    <div className="sample-shell">
      <div className="sample-shell__toolbar">
        <div>
          <span className="sample-shell__label">Interactive fixture</span>
          <strong>Northstar Notes / launch-07</strong>
        </div>
        <div className="scenario-switch" aria-label="Sample state">
          <button
            type="button"
            aria-pressed={scenario === "drift"}
            onClick={() => changeScenario("drift")}
          >
            Drift detected
          </button>
          <button
            type="button"
            aria-pressed={scenario === "aligned"}
            onClick={() => changeScenario("aligned")}
          >
            After fixes
          </button>
        </div>
      </div>

      <div className="sample-shell__grid">
        <ManifestCode scenario={scenario} />

        <div className="findings-panel">
          <div className="findings-panel__head">
            <span>Findings</span>
            <span>{findings.length.toString().padStart(2, "0")}</span>
          </div>
          <div className="findings-list" aria-label="Sample findings">
            {findings.map((finding, index) => (
              <button
                type="button"
                key={finding.id}
                aria-pressed={finding.id === selected.id}
                aria-controls={detailsId}
                onClick={() => setSelectedId(finding.id)}
              >
                <span className={`finding-mark finding-mark--${finding.tone}`}>
                  <MarkIcon tone={finding.tone} />
                </span>
                <span>
                  <small>{toneLabels[finding.tone]}</small>
                  <strong>{finding.rule}</strong>
                </span>
                <span className="finding-number">0{index + 1}</span>
              </button>
            ))}
          </div>
        </div>

        <article className="finding-detail" id={detailsId} aria-live="polite">
          <header>
            <span className={`finding-mark finding-mark--${selected.tone}`}>
              <MarkIcon tone={selected.tone} />
            </span>
            <span>{selected.eyebrow}</span>
            <span className="finding-detail__rule">{selected.rule}</span>
          </header>
          <div className="finding-detail__body">
            <h3>{selected.title}</h3>
            <p>{selected.summary}</p>
            <dl className="evidence-diff">
              <div>
                <dt>Observed in source</dt>
                <dd>{selected.codeValue}</dd>
              </div>
              <div>
                <dt>Recorded in manifest</dt>
                <dd>{selected.manifestValue}</dd>
              </div>
            </dl>
          </div>
          <footer>
            <div>
              <span>Next action</span>
              <p>{selected.action}</p>
            </div>
            <span className="official-reference">{selected.reference}</span>
          </footer>
        </article>
      </div>
      <p className="sample-disclosure">
        This interactive report uses invented domains, names, routes, and scopes. It runs entirely in your browser;
        there is no editor upload or server-side analysis.
      </p>
    </div>
  );
}

function AppHeader() {
  return (
    <header className="site-header">
      <a className="brand" href="#top" aria-label="ScopeParity home">
        <BrandMark />
        <span>ScopeParity</span>
      </a>
      <nav aria-label="Primary navigation">
        <a href="#compare">What it compares</a>
        <a href="#sample">Sample report</a>
        <a href="#pricing">Pricing</a>
      </nav>
      <a className="header-cta" href="#cli" data-event="header_cli_anchor">
        Run locally <ArrowIcon />
      </a>
    </header>
  );
}

export function App() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="page" id="top">
        <AppHeader />

        <main id="main-content">
          <section className="hero" aria-labelledby="hero-title">
            <div className="hero__copy">
              <div className="eyebrow">
                <span className="eyebrow__line" />
                Local Google OAuth launch evidence
              </div>
              <h1 id="hero-title">See the technical story Google will compare, before you submit it.</h1>
              <p className="hero__lede">
                ScopeParity compares requested scopes, your secret-free launch manifest, public identity surfaces,
                and the demo-video plan—then compiles the differences into one traceable report.
              </p>
              <div className="hero__actions" id="cli">
                <Command placement="hero" />
                <a href="#sample" data-event="hero_sample_report_click">
                  Explore a sample report <ArrowIcon />
                </a>
              </div>
              <ul className="hero__assurances" aria-label="Product assurances">
                <li>Tracked files only</li>
                <li>No Google credentials</li>
                <li>No approval score</li>
              </ul>
            </div>
            <div className="hero__visual">
              <div className="hero__annotation hero__annotation--top" aria-hidden="true">
                <span>Pre-submission run</span>
                <i />
              </div>
              <HeroReport />
              <div className="hero__annotation hero__annotation--bottom" aria-hidden="true">
                <i />
                <span>Shareable evidence, generated locally</span>
              </div>
            </div>
          </section>

          <section className="context-strip" aria-label="Product positioning">
            <p>Not another OAuth checklist.</p>
            <p>
              A deterministic comparison of <strong>what the code requests</strong>, <strong>what you declare</strong>,
              and <strong>what the recording proves</strong>.
            </p>
          </section>

          <section className="section section--compare" id="compare" aria-labelledby="compare-title">
            <div className="section-heading section-heading--split">
              <div>
                <span className="section-index">01 / THREE SURFACES</span>
                <h2 id="compare-title">Reviewers see a story.<br />Developers maintain fragments.</h2>
              </div>
              <p>
                ScopeParity gives the fragments stable names and compares them before launch. Red is reserved for an
                objective mismatch. Human judgment stays visibly separate.
              </p>
            </div>
            <SurfaceComparison />
          </section>

          <section className="section section--sample" id="sample" aria-labelledby="sample-title">
            <div className="section-heading section-heading--split">
              <div>
                <span className="section-index">02 / SAMPLE REPORT</span>
                <h2 id="sample-title">A finding should show its work.</h2>
              </div>
              <p>
                Switch between findings in a fictional launch fixture. Every result names the two disagreeing
                surfaces, one next action, and the relevant official reference.
              </p>
            </div>
            <SampleReport />
          </section>

          <section className="section section--trust" id="trust" aria-labelledby="trust-title">
            <div className="trust-layout">
              <div className="trust-intro">
                <span className="section-index">03 / LOCAL-FIRST</span>
                <h2 id="trust-title">The safest repository upload is no repository upload.</h2>
                <p>
                  The scan runs where the source already lives. ScopeParity uses Git’s tracked-file list, accepts only
                  secret-free manifest values, and emits the report beside your project.
                </p>
              </div>
              <div className="trust-ledger">
                <div>
                  <span className="ledger-state ledger-state--stays">STAYS LOCAL</span>
                  <strong>Source discovery</strong>
                  <p>Normalized scope value, relative path, and line number. Never the source line itself.</p>
                </div>
                <div>
                  <span className="ledger-state ledger-state--stays">STAYS LOCAL</span>
                  <strong>Launch manifest</strong>
                  <p>App identity, public URLs, domains, scope names, features, and recording steps.</p>
                </div>
                <div>
                  <span className="ledger-state ledger-state--public">PUBLIC, OPT-IN</span>
                  <strong>Public page checks</strong>
                  <p>HTTPS homepage and privacy-link checks originate from your machine with private networks blocked.</p>
                </div>
                <div>
                  <span className="ledger-state ledger-state--never">NEVER REQUESTED</span>
                  <strong>Google credentials</strong>
                  <p>No client secret, access token, refresh token, service-account file, or Cloud Console access.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="section section--workflow" id="workflow" aria-labelledby="workflow-title">
            <div className="section-heading">
              <span className="section-index">04 / WORKFLOW</span>
              <h2 id="workflow-title">From repository to recording plan,<br />without a review séance.</h2>
            </div>
            <ol className="workflow-list">
              <li>
                <span>01</span>
                <div>
                  <strong>Discover</strong>
                  <p>Scan allowed, Git-tracked source files for literal Google OAuth scopes.</p>
                </div>
                <code>scopeparity scan</code>
              </li>
              <li>
                <span>02</span>
                <div>
                  <strong>Declare</strong>
                  <p>Initialize the template, then record only non-secret launch and evidence values.</p>
                </div>
                <code>scopeparity init</code>
              </li>
              <li>
                <span>03</span>
                <div>
                  <strong>Compare</strong>
                  <p>Resolve must-fix drift separately from items that require your judgment.</p>
                </div>
                <code>report.html</code>
              </li>
              <li>
                <span>04</span>
                <div>
                  <strong>Compile</strong>
                  <p>Build the paid recording workspace, evidence matrix, provenance record, and read-only CI workflow.</p>
                </div>
                <code>scopeparity-pack build</code>
              </li>
            </ol>
          </section>

          <section className="boundary" id="boundary" aria-labelledby="boundary-title">
            <div className="boundary__heading">
              <span className="section-index">THE DELIBERATE STOP</span>
              <h2 id="boundary-title">ScopeParity stops where evidence becomes judgment.</h2>
            </div>
            <div className="boundary__route" aria-label="Restricted scope boundary">
              <span>Restricted scope detected</span>
              <i aria-hidden="true" />
              <strong>SCAN STOPS</strong>
              <i aria-hidden="true" />
              <span>Official external-assessment route</span>
            </div>
            <div className="boundary__columns">
              <div>
                <h3>It can establish</h3>
                <ul>
                  <li><MarkIcon /> Which literal scopes appear in tracked source</li>
                  <li><MarkIcon /> Whether secret-free launch values agree</li>
                  <li><MarkIcon /> Whether each scope has a feature and video step</li>
                  <li><MarkIcon /> Which rule and official reference produced a finding</li>
                </ul>
              </div>
              <div>
                <h3>It will not claim</h3>
                <ul>
                  <li><MarkIcon tone="blocker" /> Approval, verification, or a probability of passing</li>
                  <li><MarkIcon tone="blocker" /> Legal, privacy-policy, Limited Use, or policy compliance</li>
                  <li><MarkIcon tone="blocker" /> Restricted-scope security assessment</li>
                  <li><MarkIcon tone="blocker" /> Endorsement by, or privileged access to, Google</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="section section--pricing" id="pricing" aria-labelledby="pricing-title">
            <div className="pricing-intro">
              <span className="section-index">05 / PRICING</span>
              <h2 id="pricing-title">The diagnosis is free. Pay to turn it into a launch workspace.</h2>
              <p>Keep every finding at no cost. Upgrade only when you need a versioned, repeatable evidence-production workflow.</p>
            </div>
            <div className="pricing-table" role="group" aria-label="ScopeParity pricing">
              <div className="pricing-row pricing-row--free">
                <div>
                  <span>Free local scan</span>
                  <strong>¥0</strong>
                </div>
                <ul>
                  <li>Scope inventory</li>
                  <li>All deterministic findings and source trace</li>
                  <li>HTML + JSON diagnostic report</li>
                  <li>Opt-in public-surface checks</li>
                  <li>No account required</li>
                </ul>
                <a href="#cli" data-event="pricing_free_scan_click">Run the scan <ArrowIcon /></a>
              </div>
              <div className="pricing-row pricing-row--reservation">
                <div>
                  <span>Founding validation reservation</span>
                  <strong>¥19,800</strong>
                  <em>fixed refund date shown before payment</em>
                </div>
                <ul>
                  <li>Credited toward the Launch Evidence Workspace</li>
                  <li>Automatically refunded if delivery misses the stated date</li>
                  <li>For sensitive, non-restricted scope projects</li>
                  <li>No approval outcome attached</li>
                </ul>
                <CheckoutCta kind="reservation" />
              </div>
              <div className="pricing-row pricing-row--launch">
                <div>
                  <span>Launch Evidence Workspace</span>
                  <strong>¥59,800 <small>/ $399</small></strong>
                  <em>one project · 30 days of updates</em>
                </div>
                <ul>
                  <li>Scope-evidence matrix in CSV + JSON</li>
                  <li>Recording runbook + local storyboard workspace</li>
                  <li>Versioned provenance record</li>
                  <li>Read-only CI workflow</li>
                  <li>Downloadable local compiler; no source upload</li>
                </ul>
                <CheckoutCta kind="evidence" />
              </div>
            </div>
            {(!RESERVATION_CHECKOUT_URL || !EVIDENCE_CHECKOUT_URL) && (
              <p className="checkout-preview-note" role="status">
                <strong>Checkout preview.</strong> The hosted Merchant of Record checkout is not connected in this
                build. No payment is accepted or counted from this page.
              </p>
            )}
            <p className="pricing-note">
              The paid download automates evidence production and maintenance. Diagnostic findings stay free. Neither
              product includes calls, policy advice, security assessment, or an approval guarantee.
            </p>
          </section>

          <section className="section section--faq" id="faq" aria-labelledby="faq-title">
            <div className="faq-intro">
              <span className="section-index">06 / QUESTIONS</span>
              <h2 id="faq-title">Read this before the reviewer email arrives.</h2>
            </div>
            <div className="faq-list">
              <details>
                <summary>Will ScopeParity get my app approved?</summary>
                <p>
                  No. It finds objective technical inconsistencies and compiles evidence. Google’s reviewers make the
                  decision, and ScopeParity never estimates or guarantees that decision.
                </p>
              </details>
              <details>
                <summary>Do you need access to my Google Cloud project?</summary>
                <p>
                  No. You copy only secret-free values into a local manifest. The tool never requests a client secret,
                  token, service-account file, or Cloud Console session.
                </p>
              </details>
              <details>
                <summary>What happens when a restricted scope is found?</summary>
                <p>
                  The scan stops at that boundary, identifies the scope, and points to Google’s official external
                  assessment path. Restricted-scope assessment is outside the product.
                </p>
              </details>
              <details>
                <summary>Does the tool write my privacy policy or scope justification?</summary>
                <p>
                  It does not write or judge privacy-policy content. It records your technical feature-to-scope trace
                  and structures the factual evidence you provide; policy and legal judgments remain yours.
                </p>
              </details>
              <details>
                <summary>What source code leaves my machine?</summary>
                <p>
                  None during the scan. Output contains a normalized scope, relative tracked-file path, and line number
                  rather than source lines. The sample above is static fictional data.
                </p>
              </details>
              <details>
                <summary>Is ScopeParity affiliated with Google?</summary>
                <p>
                  No. ScopeParity is an independent developer tool. Google, Google Cloud, and related marks belong to
                  Google LLC.
                </p>
              </details>
            </div>
          </section>

          <section className="final-cta" aria-labelledby="final-cta-title">
            <div>
              <span className="section-index">RUN 01 / LOCAL</span>
              <h2 id="final-cta-title">Find the first mismatch before it becomes a submission thread.</h2>
              <p>Two explicit steps. No account. No credentials. Every deterministic finding included.</p>
            </div>
            <Command placement="footer" />
          </section>
        </main>

        <footer className="site-footer">
          <a className="brand brand--footer" href="#top" aria-label="ScopeParity home">
            <BrandMark />
            <span>ScopeParity</span>
          </a>
          <p>Technical parity before launch. Final judgment stays with the reviewer.</p>
          <nav aria-label="Footer navigation">
            <a href="/guides/">Guides</a>
            <a href="/privacy/">Privacy</a>
            <a href="https://github.com/sora-volare0319/scopeparity" rel="noreferrer">Source</a>
            <a href="#trust">Local-first</a>
            <a href="#boundary">Boundaries</a>
            <a href="#faq">FAQ</a>
          </nav>
        </footer>
      </div>
    </>
  );
}
