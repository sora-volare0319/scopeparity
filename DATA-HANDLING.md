# ScopeParity data handling

This document describes the intended technical behavior of the current product. It is not a legal policy.

## CLI and generated reports

- Scans run on the user's machine.
- The default scan makes no network request.
- Source files and manifests are not uploaded.
- Telemetry and crash reporting are disabled.
- Reports do not contain source lines, credentials, or absolute user paths.
- Generated HTML is self-contained and uses no remote fonts, scripts, analytics, or CDN assets.
- Opt-in public URL checks fetch only the URLs declared in the secret-free manifest and send no repository content.
- License validation, when introduced for a paid build, must be separately disclosed and send no scan result or source metadata.

## Product website

The initial static website sends no product repository data and does not execute scans. Its interactive report uses synthetic sample values. Aggregate marketing analytics and checkout integrations remain disabled until their production endpoints and disclosures are configured.

## Values ScopeParity does not need

Do not provide:

- Google OAuth client IDs or client secrets;
- access or refresh tokens;
- service-account keys;
- Google account passwords;
- Google Cloud project access;
- private source-code archives;
- customer user data.
