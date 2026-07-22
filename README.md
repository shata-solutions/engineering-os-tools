# engineering-os-tools

Two small, zero-dependency Node.js scripts and their matching GitHub Actions reusable
workflows for checking a repository against a baseline of expected files
(README, LICENSE, CHANGELOG, CONTRIBUTING, SECURITY, ARCHITECTURE, AI-assistance
disclosure, tests, CI) and computing a rough, heuristic engineering-quality score from
what's mechanically checkable in a local checkout.

This is generic tooling — it doesn't know anything about your specific repositories or
organization. It answers "does this repo have the load-bearing pieces of a reasonable
baseline," not "is this repo good." Content quality is always a human/PR-review
concern; the score here is a floor, not a certification.

## Quick start — as a GitHub Actions caller

```yaml
name: CI

on:
  push:
  pull_request:

jobs:
  blueprint:
    uses: shatasolutions/engineering-os-tools/.github/workflows/repo-blueprint-check.yml@v1

  score:
    uses: shatasolutions/engineering-os-tools/.github/workflows/engineering-score.yml@v1
```

No secrets, no setup beyond the `uses:` lines above — this repository is public, so the
calling repository's default `GITHUB_TOKEN` is all that's needed.

**Pinning:** use `@v1` for a maintained, moving major-version tag (recommended for most
callers — picks up fixes automatically, never a breaking change within v1); `@v1.0.0`
(or any other exact tag) for a fully stable, unmoving reference; or a commit SHA for
maximum supply-chain immutability. See [`RELEASING.md`](RELEASING.md) for exactly what
each of these means and how they're maintained.

## Quick start — as a local CLI

```bash
git clone https://github.com/shatasolutions/engineering-os-tools.git
node engineering-os-tools/scripts/check-repo-blueprint.mjs /path/to/your/repo
node engineering-os-tools/scripts/engineering-score.mjs /path/to/your/repo
```

Exit code of `check-repo-blueprint.mjs`: `0` = compliant at the required tier, `1` =
not compliant, `2` = bad path. `engineering-score.mjs` is informational only and always
exits `0`.

## What's checked

`check-repo-blueprint.mjs` — file-presence only, two tiers:

- **Required** (fails the check): `README.md`, `LICENSE`, `CHANGELOG.md`,
  `CONTRIBUTING.md`, `SECURITY.md`, `ARCHITECTURE.md`, `AI_ASSISTED_ENGINEERING.md`,
  `.github/`, `.gitignore`, and confirmation that `.env` is git-ignored.
- **Recommended** (warns, doesn't fail): `.env.example`, `ROADMAP.md`,
  `CODE_OF_CONDUCT.md`, `docs/`, a PR template, `CODEOWNERS`, a CI workflow, and test
  evidence (a `tests`/`test`/`__tests__` directory at any depth, a colocated
  `*.test.*`/`*.spec.*` file, or a `test` script in `package.json`).

`engineering-score.mjs` — 8 categories, 100 points, from the same file-presence
signals plus a few light heuristics (README word count, script count in
`package.json`, `.gitignore` covering `.env`). See the script's own source for the
exact point breakdown — it's short and meant to be read.

## Design notes

- **Every path check is case-insensitive and OS-independent by construction** — see
  `scripts/lib/fs-case-insensitive.mjs`. It never relies on the host filesystem's own
  case-folding (macOS/Windows are case-insensitive by default, Linux is not), so
  results are identical everywhere, including GitHub Actions' `ubuntu-latest` runners.
- **Test detection is a bounded, short-circuiting recursive scan** — see
  `scripts/lib/test-detection.mjs`. It matches real on-disk filenames only, never file
  contents (so a README that mentions `foo.test.ts` in prose can't produce a false
  positive), and skips dependency/build/VCS directories by name.
- Both scripts and both libraries have their own `node --test` regression suite —
  `scripts/*.test.mjs`, `scripts/lib/*.test.mjs`. Zero test-framework dependency; Node
  20+ has `node:test` built in.

## Known limitations

- Test-file detection covers JavaScript/TypeScript conventions only
  (`*.test.{ts,tsx,js,jsx,mjs,cjs}`, `*.spec.{...}`) — not Python, Ruby, Go, or other
  ecosystems' conventions.
- If a case-sensitive filesystem somehow contains two case-variant files at once (e.g.
  both `README.md` and `readme.md`), path resolution picks whichever sorts first
  alphabetically — deterministic, but not meaningful beyond that. This is a
  pathological, essentially never-occurring scenario, documented in
  `scripts/lib/fs-case-insensitive.mjs`'s own header comment.
- Six real quality dimensions (architecture quality, code quality, performance,
  scalability, visual consistency, engineering maturity) have no mechanical check at
  all and require human review — the score only ever reflects what's checkable from a
  local file listing.

## Contributing / Security / Conduct / AI use

See [`CONTRIBUTING.md`](CONTRIBUTING.md), [`SECURITY.md`](SECURITY.md),
[`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md), and
[`AI_ASSISTED_ENGINEERING.md`](AI_ASSISTED_ENGINEERING.md).

## License

MIT — see [`LICENSE`](LICENSE).
