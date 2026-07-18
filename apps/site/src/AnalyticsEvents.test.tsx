import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { track } from "@vercel/analytics/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnalyticsEvents, isAllowedAnalyticsEvent, trackEvent } from "./AnalyticsEvents";
import { App } from "./App";

vi.mock("@vercel/analytics/react", () => ({
  track: vi.fn(),
}));

describe("AnalyticsEvents", () => {
  beforeEach(() => {
    vi.mocked(track).mockClear();
  });

  it("accepts only explicitly allowlisted event names", () => {
    expect(trackEvent("pricing_free_scan_click")).toBe(true);
    expect(track).toHaveBeenCalledWith("pricing_free_scan_click");

    expect(trackEvent("dynamic_injected_event")).toBe(false);
    expect(track).toHaveBeenCalledTimes(1);
  });

  it("allowlists every declarative site event and each successful-copy event", () => {
    const { container } = render(<App />);
    const declarativeEvents = Array.from(container.querySelectorAll<HTMLElement>("[data-event]"), (element) =>
      element.dataset.event,
    );

    expect(declarativeEvents.length).toBeGreaterThan(0);
    for (const eventName of declarativeEvents) {
      expect(isAllowedAnalyticsEvent(eventName)).toBe(true);
    }

    for (const eventName of [
      "hero_init_copy",
      "hero_scan_copy",
      "footer_init_copy",
      "footer_scan_copy",
      "evidence_checkout_click",
    ]) {
      expect(isAllowedAnalyticsEvent(eventName)).toBe(true);
    }
  });

  it("tracks an allowlisted delegated click once and ignores unknown names", async () => {
    const user = userEvent.setup();
    const { getByRole } = render(
      <>
        <AnalyticsEvents />
        <button data-event="workspace_interest_click">Known</button>
        <button data-event="unknown_event">Unknown</button>
      </>,
    );

    await user.click(getByRole("button", { name: "Known" }));
    await user.click(getByRole("button", { name: "Unknown" }));

    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith("workspace_interest_click");
  });
});
