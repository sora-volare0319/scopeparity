# Acceptance fixtures

- `aligned-app` — no objective drift; Calendar write scope has a feature and storyboard step.
- `drift-app` — source/manifest scope drift, unlisted redirect host, privacy-domain mismatch, and missing evidence.
- `restricted-app` — must stop at the restricted-scope assessment boundary.

All names, domains, and product data are synthetic. These fixtures contain no credentials or customer data.

`public-examples/` contains three paired, synthetic before/after projects used for public report snapshots:

- `scope-drift` — runtime and intended consent-screen scope sets disagree, then align.
- `video-gap` — source, manifest, and feature agree, but the per-scope recording step is missing, then added.
- `identity-config` — the privacy URL duplicates the homepage and a redirect host is undeclared, then both values align.

Every example uses a known sensitive, non-restricted Calendar scope. They are technical fixtures, not approval predictions.
