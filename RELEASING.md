# Releasing

This repository uses [Semantic Versioning](https://semver.org/) from its first
release. Three ways to reference it from a caller workflow, in increasing order of
supply-chain strictness:

| Reference | Example | Behavior | Recommended for |
|---|---|---|---|
| Moving major tag | `@v1` | Repointed to the latest verified `v1.x.x` after every release | Most callers — automatic fixes/improvements, never a breaking change within v1 |
| Exact tag | `@v1.0.0` | Never moves once published | Callers who want to upgrade deliberately, on their own schedule |
| Commit SHA | `@a1b2c3d...` | Never moves, ever, by definition | Maximum supply-chain immutability — the exact code that ran is guaranteed never to change |

## Release process

1. Land changes on `main` via normal PRs. Every PR that changes behavior updates
   `CHANGELOG.md`'s `Unreleased` section in the same PR.
2. When ready to release:
   - Decide the version bump per SemVer: **patch** for a bug fix with no behavior
     change to the public interface (the `uses:` contract, script CLI, exit codes);
     **minor** for a backward-compatible addition (e.g. a new check, a new detected
     test-file convention); **major** for anything that changes existing behavior a
     caller could be relying on (a check that used to pass now fails, a scoring
     category's point value changes, the `workflow_call` interface changes).
   - Move `CHANGELOG.md`'s `Unreleased` section under a new `## [X.Y.Z] - YYYY-MM-DD`
     heading.
   - Tag the exact commit: `git tag -a vX.Y.Z -m "vX.Y.Z" && git push origin vX.Y.Z`.
3. **Verify the exact tag before doing anything else** — this is the gate before `v1`
   (or whichever major) is touched:
   - Confirm the tag points at the intended commit: `git rev-list -n1 vX.Y.Z`.
   - Trigger at least one real caller workflow run pinned to the exact new tag (not
     `@v1`) and confirm it passes for the right reasons.
4. **Only after that verification passes**, move the moving major tag:
   ```
   git tag -f v1 vX.Y.Z
   git push origin v1 --force
   ```
   `v1` is the *only* tag this repo ever force-moves, and only after step 3's
   verification — exact tags (`v1.0.0`, `v1.1.0`, ...) are never force-pushed or
   rewritten once published; that immutability is the entire point of offering them
   as an alternative to `@v1`.

## Rollback procedure

If a release turns out to be broken:

1. **If `v1` was already moved to the broken tag:** immediately re-point it back to the
   last known-good exact tag: `git tag -f v1 vX.Y.Z-last-good && git push origin v1 --force`.
   Callers pinned to `@v1` recover on their next run with no action needed on their
   end. Callers pinned to the broken exact tag or a bad SHA are unaffected by this step
   and need to update their own pin (exact tags are intentionally never rewritten, so
   the broken version stays available and inspectable — it's just not what `v1` points
   to anymore).
2. Publish a `CHANGELOG.md` entry and, for anything that actually broke a caller, a new
   patch/minor release with the fix, following the normal process above — don't leave
   the broken exact tag as the last word without a documented fix release.
3. If the break was caused by a change to the reusable workflow YAML itself (not just
   the scripts), double-check any caller pinned to a commit SHA that included the
   breaking change — SHA pins are immutable, so those callers need to move their pin
   forward themselves once a fix is released; this repo cannot retroactively fix a SHA
   a caller already pinned to.

## Verifying a release from the outside

Anyone consuming this tool can verify what a given tag actually contains without
trusting this document:

```bash
git clone https://github.com/shatasolutions/engineering-os-tools.git
cd engineering-os-tools
git log v1.0.0 -1        # confirm the tag's commit and message
git diff v1.0.0 v1        # confirm v1 currently points at v1.0.0 (or wherever it's been moved to)
```
