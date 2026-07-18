import { track } from "@vercel/analytics/react";
import { useEffect } from "react";

const ANALYTICS_EVENT_NAMES = [
  "header_cli_anchor",
  "hero_init_copy",
  "hero_scan_copy",
  "footer_init_copy",
  "footer_scan_copy",
  "hero_sample_report_click",
  "sample_public_examples_click",
  "pricing_free_scan_click",
  "workspace_interest_click",
  "evidence_checkout_click",
] as const;

const ALLOWED_EVENT_NAMES = new Set<string>(ANALYTICS_EVENT_NAMES);

export function isAllowedAnalyticsEvent(value: string | undefined): value is string {
  return Boolean(value && ALLOWED_EVENT_NAMES.has(value));
}

export function trackEvent(eventName: string): boolean {
  if (!isAllowedAnalyticsEvent(eventName)) return false;
  track(eventName);
  return true;
}

export function AnalyticsEvents() {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;

      const target = event.target.closest<HTMLElement>("[data-event]");
      const eventName = target?.dataset.event;
      if (!isAllowedAnalyticsEvent(eventName)) return;

      trackEvent(eventName);
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return null;
}
