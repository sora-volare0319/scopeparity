# ScopeParity

ScopeParity is a local-first Google OAuth launch-evidence compiler and CI parity guard. It compares scopes requested by tracked source files with a secret-free submission manifest, checks objective URL/domain consistency, and builds a traceable report plus video storyboard.

ScopeParity does **not** approve apps, interpret policy or law, assess restricted scopes, or require Google credentials.

[Open the interactive report](https://scopeparity.vercel.app/) · [Read the exact-error guides](https://scopeparity.vercel.app/guides/)

## Run the public scanner

Create the secret-free manifest once:

```bash
npx -y github:sora-volare0319/scopeparity-cli#v0.1.4 init .
```

Review `oauth-evidence.yaml`, replace the example values with the launch values you intend to submit, then scan:

```bash
npx -y github:sora-volare0319/scopeparity-cli#v0.1.4 scan . --manifest oauth-evidence.yaml
```

The current release is distributed from the versioned
[`scopeparity-cli`](https://github.com/sora-volare0319/scopeparity-cli/tree/v0.1.4)
repository while the canonical npm package is not authenticated. The bundled
release contains no runtime dependencies; its source and tests live here.

## Guard pull requests

Run the same bounded comparison in GitHub Actions:

```yaml
- uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0
- uses: sora-volare0319/scopeparity-cli@v1.0.0
  with:
    manifest: oauth-evidence.yaml
    report: scopeparity-report.html
```

The Action installs no project dependencies, keeps public URL checks off, and sends no source or manifest data to ScopeParity. See the [official IDE lint comparison](https://scopeparity.vercel.app/guides/google-workspace-ide-scope-lint-vs-scopeparity/) for the separate roles of Google's code-time guidance and ScopeParity's cross-surface check.

## Workspace

- `packages/core` — deterministic discovery, extraction, rules, and report model
- `packages/cli` — credential-free local command-line workflow
- `packages/revenue` — verified Polar webhook ingestion and conservative, refund-aware revenue ledger
- `apps/site` — product site and interactive sample report
- `docs` — market, revenue, product, and validation decisions
- `fixtures` — seeded mismatch scenarios used for acceptance testing

The product is under active validation. See [the market decision](docs/01-market-decision.md) and [revenue model](docs/02-revenue-model.md).
