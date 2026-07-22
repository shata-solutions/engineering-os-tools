# Contributing

## Before you start

1. Read [`README.md`](README.md) and [`ARCHITECTURE.md`](ARCHITECTURE.md) first.
2. For anything structural (a new rule, a scoring change, a new dependency), open an
   issue first — this is small, generic tooling, and structural changes affect every
   consumer.
3. Follow [Conventional Commits](https://www.conventionalcommits.org/) for commit
   messages (`feat:`, `fix:`, `docs:`, `chore:`, `test:`).

## Making a change

- Keep the change scoped to what was asked — no unrequested refactors bundled in.
- Update `README.md`/`ARCHITECTURE.md` if the change affects what's documented there,
  in the same PR.
- Add or update tests in `scripts/*.test.mjs` / `scripts/lib/*.test.mjs` — run the full
  suite with `node --test` from the repo root before opening a PR. No test framework
  dependency; `node:test` is built in (Node 20+).
- This tooling is deliberately zero-dependency (no `npm install` required to run it).
  A PR adding a runtime dependency needs a strong justification.

## Pull requests

State what changed, why, and how it was verified (`node --test` output, and — if the
change affects behavior — the actual before/after output of running the changed script
against a real or constructed test repo).

## Releases

See [`RELEASING.md`](RELEASING.md) for the versioning and tagging process.

## Questions / security

See [`SECURITY.md`](SECURITY.md) for vulnerability reports. For anything else, open an
issue.
