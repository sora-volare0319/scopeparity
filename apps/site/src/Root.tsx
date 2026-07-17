import { Analytics } from "@vercel/analytics/react";
import { StrictMode } from "react";
import { App } from "./App";

export function Root() {
  return (
    <StrictMode>
      <App />
      <Analytics />
    </StrictMode>
  );
}
