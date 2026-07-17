import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
}

test("landing page explains the boundary and keeps checkout honest", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "See the technical story Google will compare, before you submit it.",
    }),
  ).toBeVisible();
  await expect(page.locator('[data-checkout-state="preview"]')).toHaveCount(2);
  await expect(page.getByText("Checkout preview.", { exact: false })).toBeVisible();
  await expect(page.getByText("ScopeParity stops where evidence becomes judgment.")).toBeVisible();

  await page.getByRole("button", { name: "After fixes" }).click();
  await expect(page.getByLabel("Aligned fictional manifest")).toBeVisible();
  await expect(page.getByText("Both requested scopes are represented in the launch manifest.")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
});

test("static exact-intent guide is rendered and accessible", async ({ page }) => {
  await page.goto("/guides/verified-but-unverified/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Google OAuth app verified—but users still see ‘unverified app’",
    }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Check these surfaces in order" })).toBeVisible();
  await expect(
    page
      .getByText("npx -y github:sora-volare0319/scopeparity-cli#v0.1.0 scan .", { exact: true })
      .first(),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
});
