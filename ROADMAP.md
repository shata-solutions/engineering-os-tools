# Roadmap

**Status legend:** Active · Planned · Deferred.

## Active

None currently — `v1.0.0` is a stable, complete initial release for its stated scope
(file-presence blueprint checking + heuristic scoring).

## Planned

- Extend `scripts/lib/test-detection.mjs`'s pattern list to non-JS/TS ecosystems
  (Python, Ruby, Go conventions) if/when a real consumer needs it — not built
  speculatively ahead of an actual need.

## Deferred

- A cross-repo score dashboard aggregating multiple `engineering-score.mjs` runs —
  reasonable at a scale where running the script per-repo by hand becomes tedious, not
  needed at today's scale.
- GitHub App-based authentication as an alternative caller pattern — not needed at all
  by this tool's current design (it requires zero authentication), but could matter if
  a future capability required write access to a calling repo.
