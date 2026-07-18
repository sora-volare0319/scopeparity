import { Analytics } from "@vercel/analytics/react";
import { StrictMode } from "react";
import { AnalyticsEvents } from "./AnalyticsEvents";
import { App } from "./App";

export function Root() {
  return (
    <StrictMode>
      <App />
      <AnalyticsEvents />
      <Analytics />
    </StrictMode>
  );
}
