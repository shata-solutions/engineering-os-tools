#!/usr/bin/env node
// Engineering Quality Score (heuristic, local-only)
// Restricted to what is mechanically checkable from a local checkout: no live CI
// status, no test coverage numbers, no runtime/performance data. Treat the output as a
// floor, not a certification — pair it with a real human review for anything this
// script can't see (architecture quality, code quality, performance, scalability,
// visual consistency, engineering maturity).
//
// Usage: node engineering-score.mjs [path-to-repo]

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
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
function has(rel) {
  return existsCaseInsensitive(target, rel);
}
function read(rel) {
  const resolved = resolveCaseInsensitive(target, rel);
  if (!resolved) return "";
  try {
    return readFileSync(resolved, "utf8");
  } catch {
    return "";
  }
}
function readJson(rel) {
  try {
    return JSON.parse(read(rel));
  } catch {
    return null;
  }
}
function wordCountAtLeast(rel, n) {
  const content = read(rel);
  return content.split(/\s+/).filter(Boolean).length >= n;
}
function dirHasFiles(rel) {
  const resolved = resolveCaseInsensitive(target, rel);
  if (!resolved) return false;
  try {
    return readdirSync(resolved).length > 0;
  } catch {
    return false;
  }
}

// Each category: { label, max, run() -> { points, max, notes: string[] } }
const categories = [
  {
    label: "Documentation",
    max: 15,
    run() {
      let points = 0;
      const notes = [];
      if (has("README.md") && wordCountAtLeast("README.md", 80)) { points += 6; } else notes.push("README.md missing or too thin (<80 words)");
      if (has("ARCHITECTURE.md")) { points += 5; } else notes.push("ARCHITECTURE.md missing");
      if (has("docs") && dirHasFiles("docs")) { points += 4; } else notes.push("docs/ missing or empty");
      return { points, notes };
    },
  },
  {
    label: "Repository Hygiene",
    max: 15,
    run() {
      let points = 0;
      const notes = [];
      if (has(".gitignore")) points += 3; else notes.push(".gitignore missing");
      if (has("CHANGELOG.md")) points += 4; else notes.push("CHANGELOG.md missing");
      if (has("LICENSE") || has("LICENSE.md")) points += 4; else notes.push("LICENSE missing");
      if (has(".env.example")) points += 4; else notes.push(".env.example missing (if repo uses env vars)");
      return { points, notes };
    },
  },
  {
    label: "Security",
    max: 15,
    run() {
      let points = 0;
      const notes = [];
      if (has("SECURITY.md")) points += 6; else notes.push("SECURITY.md missing");
      const gi = read(".gitignore");
      if (/\.env(\*|$)/m.test(gi) || gi.includes(".env")) points += 6; else notes.push(".env not confirmed git-ignored");
      if (!has(".env") || has(".gitignore")) points += 3; // can't fully verify tracked status without git, partial credit
      return { points, notes };
    },
  },
  {
    label: "Testing",
    max: 10,
    run() {
      let points = 0;
      const notes = [];
      const pkg = readJson("package.json");
      if (pkg?.scripts?.test) points += 5; else notes.push("no `test` script in package.json");
      // Recognizes a conventional test directory at ANY depth (not just repo root —
      // monorepos commonly nest it, e.g. packages/core/test/) and colocated
      // *.test.*/*.spec.* files. See lib/test-detection.mjs.
      const evidence = findTestEvidence(target);
      if (evidence.found) points += 5; else notes.push(evidence.reason);
      return { points, notes };
    },
  },
  {
    label: "Developer Experience",
    max: 10,
    run() {
      let points = 0;
      const notes = [];
      if (has(".github/workflows") && dirHasFiles(".github/workflows")) points += 5; else notes.push("no CI workflow in .github/workflows/");
      const pkg = readJson("package.json");
      if (pkg?.scripts && Object.keys(pkg.scripts).length >= 3) points += 5; else notes.push("package.json has fewer than 3 scripts (dev/build/lint/test expected)");
      return { points, notes };
    },
  },
  {
    label: "Open Source / Contribution Readiness",
    max: 10,
    run() {
      let points = 0;
      const notes = [];
      if (has("CONTRIBUTING.md")) points += 5; else notes.push("CONTRIBUTING.md missing");
      // has() is case-insensitive, so this matches PULL_REQUEST_TEMPLATE.md or
      // pull_request_template.md (or any other casing) — GitHub itself accepts either.
      if (has(".github/pull_request_template.md") || has(".github/ISSUE_TEMPLATE")) points += 5; else notes.push("no PR/issue templates (an account-wide default may cover this if your account's default community-health repo is public)");
      return { points, notes };
    },
  },
  {
    label: "AI Transparency",
    max: 10,
    run() {
      let points = 0;
      const notes = [];
      if (has("AI_ASSISTED_ENGINEERING.md")) points += 10; else notes.push("AI_ASSISTED_ENGINEERING.md missing");
      return { points, notes };
    },
  },
  {
    label: "Repository Hygiene — Ownership & Process",
    max: 15,
    run() {
      let points = 0;
      const notes = [];
      if (has(".github/CODEOWNERS") || has("CODEOWNERS")) points += 5; else notes.push("no CODEOWNERS file");
      if (has("ROADMAP.md")) points += 5; else notes.push("ROADMAP.md missing");
      if (has(".github/workflows") && dirHasFiles(".github/workflows")) points += 5; else notes.push("no automated checks wired into CI");
      return { points, notes };
    },
  },
];

console.log(`Engineering Score (heuristic, local-only) — ${target}\n`);

let total = 0;
let maxTotal = 0;
for (const cat of categories) {
  const { points, notes } = cat.run();
  total += points;
  maxTotal += cat.max;
  console.log(`${cat.label.padEnd(38)} ${String(points).padStart(2)} / ${cat.max}`);
  for (const n of notes) console.log(`   - ${n}`);
}

const score = Math.round((total / maxTotal) * 100);
console.log(`\nRaw: ${total} / ${maxTotal}`);
console.log(`Engineering Score (heuristic): ${score} / 100`);
console.log(
  `\nNote: this covers ${categories.length} categories that are mechanically verifiable offline.\n` +
  `Architecture quality, code quality, performance, scalability, visual consistency, and\n` +
  `engineering maturity require human review — this score is a floor, not a certification.`
);
