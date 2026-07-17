# ScopeParity

ScopeParity is a local-first Google OAuth scope-drift scanner and launch evidence compiler. It compares scopes requested by tracked source files with a secret-free submission manifest, checks objective URL/domain consistency, and builds a traceable report plus video storyboard.

ScopeParity does **not** approve apps, interpret policy or law, assess restricted scopes, or require Google credentials.

## Run the public scanner

```bash
npx -y github:sora-volare0319/scopeparity-cli#v0.1.0 scan . --manifest oauth-evidence.yaml
```

The current release is distributed from the versioned
[`scopeparity-cli`](https://github.com/sora-volare0319/scopeparity-cli/tree/v0.1.0)
repository while the canonical npm package is not authenticated. The bundled
release contains no runtime dependencies; its source and tests live here.

## Workspace

- `packages/core` — deterministic discovery, extraction, rules, and report model
- `packages/cli` — credential-free local command-line workflow
- `apps/site` — product site and interactive sample report
- `docs` — market, revenue, product, and validation decisions
- `fixtures` — seeded mismatch scenarios used for acceptance testing

The product is under active validation. See [the market decision](docs/01-market-decision.md) and [revenue model](docs/02-revenue-model.md).
