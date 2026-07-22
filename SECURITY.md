# Security Policy

## Reporting a vulnerability

**Do not open a public GitHub issue for a security vulnerability.**

Report it privately to **info@shatasolutions.com**, including steps to reproduce and
the potential impact.

## What to expect

Acknowledgement within 3 business days; an initial severity assessment within 7
business days; a fix timeline once severity is known.

## Scope

This is a small, zero-dependency tool: two scripts that read files from a target
repository's local checkout and report on their presence. It does not execute
untrusted code, does not make network calls, and does not read file *contents* beyond
the specific files it's documented to check (and even then, only to check for simple
patterns like `.gitignore` coverage — see `scripts/README.md` in this repo for the
exact behavior). The most realistic risk surface is the two GitHub Actions reusable
workflows (`actions/checkout`, `actions/setup-node` — both maintained by GitHub) and
this repository's own supply chain (see [`RELEASING.md`](RELEASING.md) for pinning
guidance: prefer an exact tag or commit SHA over a moving reference in
security-sensitive contexts).

## Supported versions

The latest `v1.x.x` release is supported. See [`RELEASING.md`](RELEASING.md) for the
tagging scheme.
