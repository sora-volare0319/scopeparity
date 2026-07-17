import { describe, expect, it } from "vitest";

import {
  fetchPublicHomepage,
  isPublicIp,
  publicCheckFailure,
  validatePublicHttpsUrl,
} from "../src/public-check.js";

describe("public URL safety", () => {
  it.each([
    "127.0.0.1",
    "10.0.0.1",
    "100.64.0.1",
    "169.254.169.254",
    "172.16.0.1",
    "192.168.1.1",
    "::1",
    "fc00::1",
    "fe80::1",
    "2001:db8::1",
  ])("rejects non-public address %s", (address) => {
    expect(isPublicIp(address)).toBe(false);
  });

  it.each(["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"])(
    "accepts public address %s",
    (address) => {
      expect(isPublicIp(address)).toBe(true);
    },
  );

  it.each([
    "http://example.com",
    "https://user:password@example.com",
    "https://localhost",
    "https://service.internal",
    "https://127.0.0.1",
    "https://169.254.169.254/latest/meta-data",
    "https://example.com:8443",
  ])("rejects unsafe URL %s", (url) => {
    expect(() => validatePublicHttpsUrl(url)).toThrow();
  });

  it("accepts a normal public HTTPS URL and strips its fragment", () => {
    expect(validatePublicHttpsUrl("https://Example.com/path#secret").toString()).toBe(
      "https://example.com/path",
    );
  });

  it("rejects DNS responses containing any private address before connecting", async () => {
    await expect(
      fetchPublicHomepage("https://example.com", {
        lookup: async () => [
          { address: "93.184.216.34", family: 4 },
          { address: "127.0.0.1", family: 4 },
        ],
      }),
    ).rejects.toThrow(/non-public address/u);
  });

  it("sanitizes failure text before it enters a report", () => {
    expect(publicCheckFailure(new Error("bad\nheader\u0000value"))).toEqual({
      error: "bad header value",
    });
  });
});
