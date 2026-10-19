# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning follows
[Semantic Versioning](https://semver.org/) — see [`RELEASING.md`](RELEASING.md).

## [Unreleased]

## [1.0.4] - 2026-10-19

### Changed

- Canonical home moved to `shata-solutions/engineering-os-tools`. Reusable workflow
  references and the self-referencing checkout now use the organization path.
  `v1.0.0`-`v1.0.3` are unchanged; the original `shatasolutions/engineering-os-tools`
  stays available as a frozen compatibility source.

## [1.0.3] - 2026-07-22

### Fixed

- **`v1.0.2` shipped with `ENGINEERING_OS_TOOLS_REF` still pointing at `v1.0.1`** —
  the workflow YAML files' own self-referencing pin (see `RELEASING.md` and both
  workflow files' header comments for why this exists) was not updated as part of
  cutting the `v1.0.2` release, so any caller using `v1.0.2` or `v1` after it moved
  actually still ran `v1.0.1`'s (buggy) `engineering-score.mjs`. Confirmed by a real
  remote run's own logs after moving `v1` to `v1.0.2`: `ref: v1.0.1`, not `v1.0.2`.
  `v1.0.2` remains published, unmodified, with this flaw — exact tags are never
  rewritten — and is documented as broken in this entry rather than quietly
  superseded. **Use `v1.0.3` or later, or `v1`.** No callers were materially affected:
  the only behavior difference `v1.0.2` was meant to introduce (the `.env.example`
  fix) doesn't change output for any of this account's three real callers, all of
  which already have their own `.env.example`.

## [1.0.2] - 2026-07-22 — **BROKEN, see 1.0.3**

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
