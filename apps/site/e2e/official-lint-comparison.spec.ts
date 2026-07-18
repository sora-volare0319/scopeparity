import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const route = "/guides/google-workspace-ide-scope-lint-vs-scopeparity/";

test("official lint comparison is discoverable, bounded, and accessible", async ({ page, request }) => {
  const response = await request.get(route);
  expect(response.ok()).toBe(true);
  const html = await response.text();
  expect(html).toContain(
    '<link rel="canonical" href="https://scopeparity.vercel.app/guides/google-workspace-ide-scope-lint-vs-scopeparity/">',
  );
  expect(html).toContain('itemtype="https://schema.org/TechArticle"');

  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain(
    "https://scopeparity.vercel.app/guides/google-workspace-ide-scope-lint-vs-scopeparity/",
  );
  expect(await (await request.get("/llms.txt")).text()).toContain(
    "Official IDE scope lint vs. launch evidence parity",
  );

  await page.goto(route);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Google Workspace IDE scope lint vs. OAuth launch evidence parity",
    }),
  ).toBeVisible();
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { level: 2, name: "Use official lint first, then check launch parity" }),
  ).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByRole("link", { name: "Google Workspace Developer Tools" })).toHaveAttribute(
    "href",
    "https://developers.google.com/workspace/guides/developer-tools",
  );
  await expect(page.getByRole("link", { name: "Inspect the released GitHub Action" })).toHaveAttribute(
    "href",
    "https://github.com/sora-volare0319/scopeparity-cli/releases/tag/v1.0.0",
  );
  await expect(page.getByRole("link", { name: "See the current price and sales status" })).toHaveAttribute(
    "href",
    "/?utm_source=guide&utm_medium=official-lint-comparison&utm_campaign=action-v1#pricing",
  );

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
