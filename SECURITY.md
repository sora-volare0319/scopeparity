# Security

## Data boundary

ScopeParity's scanner is designed to run locally without Google credentials. It does not require or accept client secrets, access tokens, refresh tokens, service-account JSON, or Google Cloud console access.

Default discovery uses tracked files reported by Git. The scanner does not recursively walk the surrounding disk, follow symlinks, inspect submodules, or read untracked files. Reports contain normalized OAuth scope strings, relative paths, and line numbers—not source lines.

Public URL checks, when enabled, operate only on explicitly declared HTTPS URLs and must reject private, loopback, link-local, metadata, and unsafe redirect destinations.

## Reporting a vulnerability

Do not open a public issue containing a vulnerable repository, credential, or scan report. Use the repository's private security-advisory flow. Include the ScopeParity version, ruleset version, a minimal synthetic reproduction, and the expected data boundary.

## High-priority issues

- reading a file outside the selected Git repository;
- reading an excluded secret or credential file;
- following a symlink or submodule into another working tree;
- including source content, secrets, absolute user paths, or environment values in output;
- network access during a default local scan;
- an SSRF path in opt-in public URL checks;
- HTML or terminal injection through a manifest value or filename;
- reporting an unknown or restricted scope as safe for sensitive-scope review.
