import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";

describe("ScopeParity marketing site", () => {
  it("states the technical promise, price, trust boundary, and no-go boundary", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "See the technical story Google will compare, before you submit it.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("¥59,800", { exact: false })).toBeInTheDocument();
    expect(screen.getByText(/permanent use of the purchased release/)).toBeInTheDocument();
    expect(screen.getByText(/Future releases are separate/)).toBeInTheDocument();
    expect(screen.getByText("No Google credentials")).toBeInTheDocument();
    expect(screen.getByText(/Approval, verification, or a probability of passing/)).toBeInTheDocument();
    expect(screen.getByText(/This interactive report uses invented domains/)).toBeInTheDocument();
  });

  it("switches sample findings and exposes the aligned fixture without implying approval", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "Calendar write scope ships in code, but is absent from the launch manifest.",
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /REDIRECT_HOST_NOT_AUTHORIZED/ }));
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "A release callback uses a host that is not listed as an authorized domain.",
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "After fixes" }));
    expect(screen.getByLabelText("Aligned fictional manifest")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "Both requested scopes are represented in the launch manifest.",
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /HOMEPAGE_PURPOSE_CONFIRM_MANUALLY/ }));
    expect(screen.getByText(/It does not decide whether the product description is sufficient/)).toBeInTheDocument();
  });

  it("copies the safe first-run command and exposes the scan command as step two", async () => {
    const user = userEvent.setup();
    const clipboardWrite = vi.spyOn(navigator.clipboard, "writeText");
    render(<App />);

    await user.click(screen.getAllByRole("button", { name: "Copy create manifest command" })[0]!);

    expect(clipboardWrite).toHaveBeenCalledWith(
      "npx -y github:sora-volare0319/scopeparity-cli#v0.1.1 init .",
    );
    expect(screen.getAllByRole("button", { name: "Copied create manifest command" })[0]).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "2 Run scan" })[0]!);
    await user.click(screen.getAllByRole("button", { name: "Copy run scan command" })[0]!);

    expect(clipboardWrite).toHaveBeenLastCalledWith(
      "npx -y github:sora-volare0319/scopeparity-cli#v0.1.1 scan . --manifest oauth-evidence.yaml",
    );
    expect(screen.getAllByRole("button", { name: "Copied run scan command" })[0]).toBeInTheDocument();
  });

  it("renders honest checkout previews when hosted checkout URLs are unset", () => {
    render(<App />);

    const previews = screen.getAllByRole("link", { name: /checkout preview; payments are not live/i });
    expect(previews).toHaveLength(2);
    for (const preview of previews) {
      expect(preview).toHaveAttribute("href", "#pricing");
      expect(preview).toHaveAttribute("data-checkout-state", "preview");
    }

    expect(screen.getByRole("status")).toHaveTextContent("No payment is accepted or counted from this page.");
    const interestLink = screen.getByRole("link", { name: "Share purchase interest on GitHub" });
    expect(interestLink).toHaveAttribute(
      "href",
      "https://github.com/sora-volare0319/scopeparity/issues/new?template=workspace-interest.yml",
    );
    expect(screen.getByRole("status")).toHaveTextContent("This does not reserve a place or accept payment");
    expect(screen.getByRole("status")).toHaveTextContent("tied to your GitHub account");
  });
});
