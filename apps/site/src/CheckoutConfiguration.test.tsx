import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { track } from "@vercel/analytics/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@vercel/analytics/react", () => ({
  track: vi.fn(),
}));

describe("evidence checkout configuration", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.mocked(track).mockClear();
    vi.stubEnv("VITE_CHECKOUT_URL", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("opens an HTTPS checkout and emits one handoff event", async () => {
    vi.stubEnv("VITE_EVIDENCE_CHECKOUT_URL", "https://buy.polar.sh/polar_cl_example");
    const [{ App }, { AnalyticsEvents }] = await Promise.all([import("./App"), import("./AnalyticsEvents")]);
    const user = userEvent.setup();

    render(
      <>
        <App />
        <AnalyticsEvents />
      </>,
    );

    const checkout = screen.getByRole("link", { name: "Open hosted checkout for Launch Evidence Workspace" });
    expect(checkout).toHaveAttribute("href", "https://buy.polar.sh/polar_cl_example");
    expect(checkout).toHaveAttribute("data-checkout-state", "configured");
    expect(checkout).toHaveAttribute("data-event", "evidence_checkout_click");

    checkout.addEventListener("click", (event) => event.preventDefault());
    await user.click(checkout);

    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith("evidence_checkout_click");
  });

  it.each(["http://buy.polar.sh/insecure", "javascript:alert(1)", "not-a-url"])(
    "keeps an invalid checkout value in preview mode: %s",
    async (checkoutUrl) => {
      vi.stubEnv("VITE_EVIDENCE_CHECKOUT_URL", checkoutUrl);
      const { App } = await import("./App");

      render(<App />);

      const preview = screen.getByRole("link", { name: /checkout preview; payments are not live/i });
      expect(preview).toHaveAttribute("href", "#pricing");
      expect(preview).toHaveAttribute("data-checkout-state", "preview");
      expect(preview).not.toHaveAttribute("data-event");
    },
  );
});
