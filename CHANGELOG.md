# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning follows
[Semantic Versioning](https://semver.org/) — see [`RELEASING.md`](RELEASING.md).

## [Unreleased]

## [1.0.2] - 2026-07-22

### Fixed

- `engineering-score.mjs`'s Repository Hygiene category checked `.env.example`
  presence unconditionally, unlike `check-repo-blueprint.mjs`'s equivalent rule,
  which correctly skips the requirement for a repo with no env vars at all (no
  `package.json`, no `.env`/`.env.local`). Found during a cross-repo scoring audit:
  penalized zero-dependency repos (this repo itself, and `shatasolutions/.github`)
  4 points for a file they have no reason to have. Fixed by adding the same
  `usesEnvVars()` exemption the blueprint checker already used. No change for any
  repo that already has `.env.example` or that genuinely reads env vars without one
  — confirmed by re-running against 5 real repositories: 2 gained 4 points each
  (the two zero-dependency repos), 3 were unaffected.

## [1.0.1] - 2026-07-22

### Fixed

- **Both reusable workflows silently ignored the caller's pin.** They tried to
  determine "which ref was I called at" via `github.workflow_ref`, but that context
  variable reports the *top-level calling workflow's own ref* (e.g. the caller's
  branch), not this reusable workflow's. In practice this meant the script checkout
  used whatever branch name the caller happened to be on — coincidentally "working"
  only when that branch name also existed in this repo, and never actually respecting
  an exact tag or SHA pin. Found via a real remote GitHub Actions run pinned to
  `v1.0.0`, not assumed. Fixed by having each release hardcode its own exact tag
  directly in the workflow YAML (`env.ENGINEERING_OS_TOOLS_REF`) instead of trying to
  introspect it at runtime — see both workflow files' header comments for the full
  explanation. **`v1.0.0` has this bug; use `v1.0.1` or later, or `v1`.**

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
