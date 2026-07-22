# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning follows
[Semantic Versioning](https://semver.org/) — see [`RELEASING.md`](RELEASING.md).

## [Unreleased]

## [1.0.0] - 2026-07-22

### Added

- `scripts/check-repo-blueprint.mjs` — file-presence repository blueprint checker,
  required/recommended tiers, zero dependencies.
- `scripts/engineering-score.mjs` — 8-category, 100-point heuristic engineering score.
- `scripts/lib/fs-case-insensitive.mjs` — OS-independent, case-insensitive path
  resolution used by both scripts.
- `scripts/lib/test-detection.mjs` — bounded recursive scan for test evidence
  (colocated `*.test.*`/`*.spec.*` files and nested test directories at any depth, not
  just the repo root).
- Two reusable GitHub Actions workflows (`repo-blueprint-check.yml`,
  `engineering-score.yml`, both `workflow_call`) — no secrets required; callers need
  only the `uses:` line.
- 30-test regression suite (`node --test`, zero framework dependency) covering both
  libraries directly and both scripts end-to-end via subprocess execution against
  constructed fixtures.
- Initial public release, extracted and generalized from private internal tooling —
  see [`AI_ASSISTED_ENGINEERING.md`](AI_ASSISTED_ENGINEERING.md).
