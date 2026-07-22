#!/usr/bin/env node
// Repository Blueprint Checker
// Validates a target repository against a standard baseline of files every repository
// in an engineering account/organization is expected to carry (README, LICENSE,
// CHANGELOG, CONTRIBUTING, SECURITY, ARCHITECTURE, AI-assistance disclosure, CI, tests).
// Zero dependencies. Usage: node check-repo-blueprint.mjs [path-to-repo]
//
// Exit code 0 = no REQUIRED-tier failures. Exit code 1 = at least one REQUIRED-tier failure.
// This script is intentionally file-presence-based, not content-quality-based — it answers
// "does this repo have the load-bearing pieces of the blueprint," not "are they good."
// Content quality is a human/PR-review concern, not something this script can judge.
//
// This is generic tooling: the specific blueprint checked here (which files, which
// tier) reflects one reasonable baseline. Adopting organizations are expected to
// document their own rationale for these rules (and any deviations) in their own,
// private engineering documentation — this tool only checks presence.

import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { existsCaseInsensitive, resolveCaseInsensitive } from "./lib/fs-case-insensitive.mjs";
import { findTestEvidence } from "./lib/test-detection.mjs";

const target = resolve(process.argv[2] ?? ".");

if (!existsSync(target) || !statSync(target).isDirectory()) {
  console.error(`Target path does not exist or is not a directory: ${target}`);
  process.exit(2);
}

// Every path check in this file goes through existsCaseInsensitive/resolveCaseInsensitive
// rather than a raw existsSync/readFileSync on a joined path — see
// lib/fs-case-insensitive.mjs for why: a raw check is silently OS-dependent (passes on
// macOS/Windows, can fail on Linux CI for the exact same repository).
function has(relPath) {
  return existsCaseInsensitive(target, relPath);
}

function readJson(relPath) {
  const resolved = resolveCaseInsensitive(target, relPath);
  if (!resolved) return null;
  try {
    return JSON.parse(readFileSync(resolved, "utf8"));
  } catch {
    return null;
  }
}

// tier: "required" fails the check; "recommended" warns but does not fail
const rules = [
  { id: "readme", tier: "required", desc: "README.md at repo root", test: () => has("README.md") },
  {
    id: "license-or-proprietary-note",
    tier: "required",
    desc: "LICENSE file (or explicit proprietary notice in README)",
    test: () => has("LICENSE") || has("LICENSE.md"),
  },
  { id: "env-example", tier: "recommended", desc: ".env.example present if repo reads env vars", test: () => has(".env.example") || !usesEnvVars() },
  { id: "changelog", tier: "required", desc: "CHANGELOG.md at repo root", test: () => has("CHANGELOG.md") },
  // NOTE: GitHub's default-community-health-file fallback (an account-wide .github
  // repo supplying these files to any repo that lacks its own copy) only works when
  // that source repo is PUBLIC. If your account/organization keeps its source repo
  // private, there is no working fallback and every repo needs its own physical copy.
  // Adjust this rule's tier to "recommended" if your account's fallback is confirmed
  // working (verify with `gh api repos/OWNER/REPO/community/profile` against a repo
  // that has no local copy — a working fallback reports a value, not null).
  { id: "contributing", tier: "required", desc: "CONTRIBUTING.md at repo root (no fallback unless your account's default community-health repo is public)", test: () => has("CONTRIBUTING.md") },
  { id: "security", tier: "required", desc: "SECURITY.md at repo root (no fallback unless your account's default community-health repo is public)", test: () => has("SECURITY.md") },
  { id: "code-of-conduct", tier: "recommended", desc: "CODE_OF_CONDUCT.md (own copy — no fallback unless your account's default community-health repo is public)", test: () => has("CODE_OF_CONDUCT.md") },
  { id: "architecture", tier: "required", desc: "ARCHITECTURE.md at repo root", test: () => has("ARCHITECTURE.md") },
  { id: "roadmap", tier: "recommended", desc: "ROADMAP.md at repo root", test: () => has("ROADMAP.md") },
  { id: "ai-policy", tier: "required", desc: "AI_ASSISTED_ENGINEERING.md at repo root", test: () => has("AI_ASSISTED_ENGINEERING.md") },
  { id: "docs-dir", tier: "recommended", desc: "docs/ directory", test: () => has("docs") },
  { id: "github-dir", tier: "required", desc: ".github/ directory (workflows, templates)", test: () => has(".github") },
  {
    id: "pr-template",
    tier: "recommended",
    // GitHub itself recognizes this filename in any casing (PULL_REQUEST_TEMPLATE.md,
    // pull_request_template.md, ...); this check matches that behavior instead of
    // assuming one specific casing.
    desc: ".github/pull_request_template.md, any casing (own copy — no fallback unless your account's default community-health repo is public)",
    test: () => has(".github/pull_request_template.md"),
  },
  { id: "codeowners", tier: "recommended", desc: ".github/CODEOWNERS or CODEOWNERS", test: () => has(".github/CODEOWNERS") || has("CODEOWNERS") },
  { id: "ci-workflow", tier: "recommended", desc: "At least one workflow in .github/workflows/", test: () => has(".github/workflows") },
  { id: "gitignore", tier: "required", desc: ".gitignore present", test: () => has(".gitignore") },
  { id: "env-not-tracked", tier: "required", desc: ".env is git-ignored (never committed)", test: () => gitignoreCovers(".env") },
  {
    id: "tests-dir-or-script",
    tier: "recommended",
    desc: "tests/test/__tests__ directory (at any depth), a colocated *.test.*/*.spec.* file, or a test script in package.json",
    test: () => hasTestScript() || findTestEvidence(target).found,
  },
];

function usesEnvVars() {
  return has("package.json") || has(".env") || has(".env.local");
}

function gitignoreCovers(pattern) {
  const resolved = resolveCaseInsensitive(target, ".gitignore");
  if (!resolved) return false;
  const content = readFileSync(resolved, "utf8");
  return content.split("\n").some((l) => l.trim() === pattern || l.trim() === `${pattern}*` || l.trim() === "*.env" || l.trim() === ".env*");
}

function hasTestScript() {
  const pkg = readJson("package.json");
  return Boolean(pkg?.scripts?.test);
}

let requiredFailures = 0;
let recommendedWarnings = 0;

console.log(`Repository Blueprint Check — ${target}\n`);

for (const rule of rules) {
  let pass;
  try {
    pass = Boolean(rule.test());
  } catch {
    pass = false;
  }
  const icon = pass ? "PASS" : rule.tier === "required" ? "FAIL" : "WARN";
  console.log(`[${icon}] ${rule.id.padEnd(28)} ${rule.desc}`);
  if (!pass && rule.tier === "required") requiredFailures++;
  if (!pass && rule.tier === "recommended") recommendedWarnings++;
}

console.log(`\n${rules.length} checks — ${requiredFailures} required failure(s), ${recommendedWarnings} recommended warning(s).`);

if (requiredFailures > 0) {
  console.log("\nResult: NOT COMPLIANT with the repository blueprint (required tier).");
  process.exit(1);
} else {
  console.log("\nResult: COMPLIANT with the repository blueprint (required tier).");
  process.exit(0);
}
