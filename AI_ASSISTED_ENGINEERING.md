# AI-Assisted Engineering

This repository is built with AI assistance.

## What's AI-assisted here

The two scripts, their shared libraries, their tests, the two reusable GitHub Actions
workflows, and this documentation set were all drafted by Claude (via Claude Code),
directed by the repository owner. The scripts originated as internal tooling in a
private repository and were extracted, generalized, and stripped of
account-/repository-specific references to become this standalone public tool.

## Review process

- Every script and library has a corresponding `node --test` regression suite,
  including tests specifically constructed to prove the case-insensitivity and
  test-detection logic don't depend on the host operating system's own behavior.
- The reusable workflows were validated end-to-end against real GitHub Actions runs
  (both a passing case and a deliberate, intentional failing case) before being
  published here.
- Before publication, the full codebase was scanned for secrets, credentials, and
  account-specific or repository-specific references; anything found was removed or
  genericized.

## Explicitly not yet independently line-by-line reviewed

Treat this as a strong first draft, structurally verified (tests pass, real workflow
runs succeed) rather than proofread line-by-line by a human. Flag anything that reads
wrong via an issue — see [`CONTRIBUTING.md`](CONTRIBUTING.md).
