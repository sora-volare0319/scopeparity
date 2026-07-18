import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
}

test("landing page explains the boundary and keeps checkout honest", async ({ page }) => {
  const hydrationErrors: string[] = [];
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /hydration|server rendered|did not match/iu.test(message.text())
    ) {
      hydrationErrors.push(message.text());
    }
  });
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "See the technical story Google will compare, before you submit it.",
    }),
  ).toBeVisible();
  await expect(page.locator('[data-checkout-state="preview"]')).toHaveCount(1);
  await expect(page.getByText("Evidence checkout preview.", { exact: false })).toBeVisible();
  await expect(page.getByText("ScopeParity stops where evidence becomes judgment.")).toBeVisible();
  await expect(
    page.getByText("npx -y github:sora-volare0319/scopeparity-cli#v0.1.4 init .", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByText("Already use GitHub CLI?", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "Install the free extension" })).toHaveAttribute(
    "href",
    "https://github.com/sora-volare0319/gh-scopeparity",
  );
  await page.getByRole("button", { name: "2 Run scan" }).first().click();
  await expect(
    page
      .getByText(
        "npx -y github:sora-volare0319/scopeparity-cli#v0.1.4 scan . --manifest oauth-evidence.yaml",
        { exact: true },
      )
      .first(),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Share purchase interest on GitHub" })).toHaveAttribute(
    "href",
    "https://github.com/sora-volare0319/scopeparity/issues/new?template=workspace-interest.yml",
  );
  await expect(page.getByRole("link", { name: /Open reproducible examples/ })).toHaveAttribute(
    "href",
    "/examples/",
  );

  await page.getByRole("button", { name: "After fixes" }).click();
  await expect(page.getByLabel("Aligned fictional manifest")).toBeVisible();
  await expect(page.getByText("Both requested scopes are represented in the launch manifest.")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
  expect(hydrationErrors).toEqual([]);
});

test("conversion events distinguish completed copy from checkout preview", async ({ page, context }) => {
  await page.addInitScript(() => {
    type TestWindow = Window & {
      va?: (mode: string, payload?: unknown) => void;
      __scopeParityEvents?: Array<{ name: string; keys: string[] }>;
    };
    const testWindow = window as TestWindow;
    testWindow.__scopeParityEvents = [];
    testWindow.va = (mode, payload) => {
      if (mode !== "event" || !payload || typeof payload !== "object" || !("name" in payload)) return;
      const record = payload as { name: unknown; data?: unknown };
      if (typeof record.name !== "string") return;
      testWindow.__scopeParityEvents?.push({
        name: record.name,
        keys: record.data && typeof record.data === "object" ? Object.keys(record.data) : [],
      });
    };
  });

  await page.goto("/");
  await context.grantPermissions(["clipboard-read", "clipboard-write"], {
    origin: new URL(page.url()).origin,
  });
  await page.locator('[data-event="header_cli_anchor"]').click();
  await page.locator('[data-checkout-state="preview"]').click();
  await page.getByRole("button", { name: "Copy create manifest command" }).first().click();

  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            (window as Window & { __scopeParityEvents?: Array<{ name: string; keys: string[] }> })
              .__scopeParityEvents?.length ?? 0,
        ),
      { timeout: 5_000 },
    )
    .toBe(2);

  const events = await page.evaluate(() => {
    return (window as Window & { __scopeParityEvents?: Array<{ name: string; keys: string[] }> })
      .__scopeParityEvents ?? [];
  });
  expect(events).toEqual([
    { name: "header_cli_anchor", keys: [] },
    { name: "hero_init_copy", keys: [] },
  ]);
});

test("home and agent-readable product facts are present without client rendering", async ({ request }) => {
  const homeResponse = await request.get("/");
  expect(homeResponse.ok()).toBe(true);
  const home = await homeResponse.text();
  expect(home).not.toContain('<div id="root"></div>');
  expect(home).toContain('<h1 id="hero-title">See the technical story Google will compare, before you submit it.</h1>');
  expect(home).toContain("scopeparity-cli#v0.1.4 scan . --manifest oauth-evidence.yaml");
  expect(home).toContain("https://github.com/sora-volare0319/gh-scopeparity");
  expect(home).toContain("Install the free extension");
  expect(home).toContain('itemType="https://schema.org/SoftwareApplication"');
  expect(home).toContain('itemType="https://schema.org/FAQPage"');

  const pricingResponse = await request.get("/pricing.md");
  expect(pricingResponse.ok()).toBe(true);
  const pricing = await pricingResponse.text();
  expect(pricing).toContain("Sales status: checkout is not live.");
  expect(pricing).toContain("scopeparity-cli#v0.1.4 scan . --manifest oauth-evidence.yaml");
  expect(pricing).not.toContain("Founding validation reservation");

  const llmsResponse = await request.get("/llms.txt");
  expect(llmsResponse.ok()).toBe(true);
  expect(await llmsResponse.text()).toContain("ScopeParity is a local-first developer tool");

  const sitemapResponse = await request.get("/sitemap.xml");
  expect(sitemapResponse.ok()).toBe(true);
  const sitemap = await sitemapResponse.text();
  expect(sitemap).toContain("https://scopeparity.vercel.app/pricing.md");
  expect(sitemap).toContain("https://scopeparity.vercel.app/examples/");
  expect(sitemap).toContain("https://scopeparity.vercel.app/examples/scope-drift/");
  expect(sitemap).toContain("https://scopeparity.vercel.app/guides/scope-not-showing-on-consent-screen/");
  expect(sitemap).toContain("https://scopeparity.vercel.app/guides/scope-change-reverification/");
});

test("public example hub and case remain navigable, precise, and accessible", async ({ page }) => {
  await page.goto("/examples/");

  await expect(page.locator("h1")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { level: 1, name: "See the difference before running the scan." }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /The runtime asks for one scope/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /The code and manifest agree/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /The privacy URL duplicates the homepage/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Skip to content" })).toHaveAttribute("href", "#main-content");
  await expect(page.locator("#main-content")).toHaveCount(1);
  await expect(
    page.getByText(
      "git clone --depth 1 --branch v0.1.4 https://github.com/sora-volare0319/scopeparity.git",
      { exact: false },
    ),
  ).toBeVisible();
  await expect(page.getByText(/pinned ruleset 2026\.07\.18\.2/i)).toBeVisible();
  await expect(page.getByText(/Finding order, rule IDs, counts, and report IDs/)).toBeVisible();
  await expect(page.getByText("generatedAt", { exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await page.goto("/examples/scope-drift/");
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.getByText("Before · 2 must fix", { exact: true })).toBeVisible();
  await expect(page.getByText("After · 0 must fix", { exact: true })).toBeVisible();
  for (const name of [
    "Before HTML report",
    "Before JSON report",
    "Before manifest",
    "Before source",
    "After HTML report",
    "After JSON report",
    "After manifest",
    "After source",
  ]) {
    await expect(page.getByRole("link", { name, exact: true })).toBeVisible();
  }
  await expect(page.getByRole("link", { name: "Diagnose a rejected scope justification" })).toHaveAttribute(
    "href",
    "/guides/scope-justification-rejected/",
  );
  await expect(page.getByRole("link", { name: "Run ScopeParity on your repository" })).toHaveAttribute(
    "href",
    "/#cli",
  );
  await expect(
    page.getByText(
      "git clone --depth 1 --branch v0.1.4 https://github.com/sora-volare0319/scopeparity.git",
      { exact: true },
    ),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("all public cases and HTML reports fit desktop and mobile viewports", async ({ page }) => {
  const cases = [
    { slug: "scope-drift", beforeBlockers: 2 },
    { slug: "video-gap", beforeBlockers: 1 },
    { slug: "identity-config", beforeBlockers: 2 },
  ];

  for (const fixture of cases) {
    await page.goto(`/examples/${fixture.slug}/`);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.getByText(`Before · ${fixture.beforeBlockers} must fix`, { exact: true })).toBeVisible();
    await expect(page.getByText("After · 0 must fix", { exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

    for (const phase of ["before", "after"]) {
      await page.goto(`/examples/${fixture.slug}/${phase}.html`);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex,follow");
      await expectNoHorizontalOverflow(page);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    }
  }
});

test("public fixture pages and generated reports preserve the deterministic contract", async ({ request }) => {
  const cases = [
    { slug: "scope-drift", blockers: 2 },
    { slug: "video-gap", blockers: 1 },
    { slug: "identity-config", blockers: 2 },
  ];

  for (const fixture of cases) {
    const caseResponse = await request.get(`/examples/${fixture.slug}/`);
    expect(caseResponse.ok()).toBe(true);
    const caseHtml = await caseResponse.text();
    expect(caseHtml).toContain('<meta name="robots" content="index,follow">');
    expect(caseHtml).toContain(`<link rel="canonical" href="https://scopeparity.vercel.app/examples/${fixture.slug}/">`);
    expect(caseHtml).toContain("Skip to content");

    const beforeResponse = await request.get(`/examples/${fixture.slug}/before.json`);
    expect(beforeResponse.ok()).toBe(true);
    const beforeReport = await beforeResponse.json();
    expect(beforeReport.summary.blockers).toBe(fixture.blockers);

    const afterResponse = await request.get(`/examples/${fixture.slug}/after.json`);
    expect(afterResponse.ok()).toBe(true);
    const afterReport = await afterResponse.json();
    expect(afterReport.summary).toMatchObject({ blockers: 0, manual: 0, complete: 3 });

    const sourceResponse = await request.get(`/examples/${fixture.slug}/before-auth.ts.txt`);
    expect(sourceResponse.ok()).toBe(true);
    expect(sourceResponse.headers()["content-type"]).toContain("text/plain");

    for (const phase of ["before", "after"]) {
      const reportResponse = await request.get(`/examples/${fixture.slug}/${phase}.html`);
      expect(reportResponse.ok()).toBe(true);
      expect(await reportResponse.text()).toContain('<meta name="robots" content="noindex,follow">');
    }
  }
});

test("static exact-intent guide is rendered and accessible", async ({ page }) => {
  await page.goto("/guides/verified-but-unverified/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Google OAuth app verified—but users still see ‘unverified app’",
    }),
  ).toBeVisible();
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator('article[itemtype="https://schema.org/TechArticle"]')).toHaveCount(1);
  await expect(page.locator('time[itemprop="dateModified"]')).toHaveText("18 July 2026");
  await expect(page.getByText("ScopeParity maintainers")).toBeVisible();
  await expect(page.getByRole("link", { name: "scope-set drift before/after fixture" })).toHaveAttribute(
    "href",
    "/examples/scope-drift/",
  );
  await expect(page.getByRole("heading", { name: "Check these surfaces in order" })).toBeVisible();
  await expect(
    page
      .getByText("npx -y github:sora-volare0319/scopeparity-cli#v0.1.4 scan .", { exact: true })
      .first(),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
});

test("scope-justification guide keeps automation and judgment separate", async ({ page }) => {
  await page.goto("/guides/scope-justification-rejected/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Google OAuth scope justification rejected: trace each scope to shipped code",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "A scope justification is evidence, not persuasive copy" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Build one trace for every requested scope" })).toBeVisible();
  await expect(page.getByText("A clean trace is not an approval prediction.")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
});

test("project-change cancellation guide states the Cloud Console boundary", async ({ page }) => {
  await page.goto("/guides/cancelled-project-changes/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "OAuth verification ‘Cancelled: Project Changes’: compare the submission snapshot",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "“Cancelled: Project Changes” means the pending review no longer matches",
    }),
  ).toBeVisible();
  await expect(page.getByText("ScopeParity can produce the second snapshot without Google credentials.")).toBeVisible();
  await expect(page.getByText("Cloud Console only")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
});

test("homepage-failure guide distinguishes fetched evidence from browser judgment", async ({ page }) => {
  await page.goto("/guides/homepage-verification-failed/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Google OAuth homepage verification failed: check the URL before rewriting the page",
    }),
  ).toBeVisible();
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.getByText("A raw HTML fetch does not execute the app", { exact: false })).toBeVisible();
  await expect(page.getByText("HOMEPAGE_REDIRECT_CHANGED_URL", { exact: true })).toBeVisible();
  await expect(page.getByText("manual confirmation, not proof", { exact: false })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
});

test("scope-not-showing guide separates Console, runtime, and token evidence", async ({ page }) => {
  await page.goto("/guides/scope-not-showing-on-consent-screen/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Google OAuth scope not showing: check the request, API, and Data Access",
    }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "If the scope is absent from Data Access" })).toBeVisible();
  await expect(page.getByText("The Cloud Console does not add a scope to an authorization request.")).toBeVisible();
  await expect(page.getByRole("link", { name: "scope-set drift before/after fixture" })).toHaveAttribute(
    "href",
    "/examples/scope-drift/",
  );
  if ((page.viewportSize()?.width ?? 0) <= 800) {
    const headingBox = await page.getByRole("heading", { level: 1 }).boundingBox();
    const toolBox = await page.locator('aside[aria-label="Run ScopeParity"]').boundingBox();
    expect(headingBox).not.toBeNull();
    expect(toolBox).not.toBeNull();
    expect(headingBox!.y).toBeLessThan(toolBox!.y);
  }
  await expectNoHorizontalOverflow(page);

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
});

test("scope-change guide gives an explicit review and release sequence", async ({ page }) => {
  await page.goto("/guides/scope-change-reverification/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Add a Google OAuth scope to a verified app: safe re-verification order",
    }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Stage a new scope without breaking the verified production flow" })).toBeVisible();
  await expect(page.getByText("Submit and wait for the scope to be approved.", { exact: false })).toBeVisible();
  await expect(page.getByText("operational inference", { exact: false })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
});

test("privacy disclosure separates website, scanner, compiler, and checkout data", async ({ page }) => {
  await page.goto("/privacy/");

  await expect(page.getByRole("heading", { level: 1, name: "Privacy, by surface." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Website analytics" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Free scanner" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Public GitHub feedback" })).toBeVisible();
  await expect(page.getByText("Checkout is not live", { exact: false })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
});
