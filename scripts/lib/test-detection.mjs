// Test-evidence detection.
//
// A naive "does tests/ exist at the repo root" check misses two extremely common,
// legitimate patterns: colocated test files (`src/foo.test.ts`, `src/Bar.spec.tsx`) and
// nested test directories in a monorepo (`packages/core/test/`, one or more levels
// below the repo root, with no root-level `tests/` directory at all). A root-only check
// would wrongly report "no tests" for a repository that has hundreds of real, passing
// tests, just organized this way.
//
// Only real filenames on disk are ever matched — file *contents* are never read or
// grepped, so documentation that merely mentions "foo.test.ts" in prose cannot produce
// a false positive. Traversal skips dependency/build/VCS directories by name, so
// vendored or generated code cannot produce a false positive either.
//
// The scan is bounded (max depth, max entries visited) so it can't run away on a huge
// or pathological tree, and short-circuits on the first match it finds, so a repo that
// actually has tests resolves quickly.

import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SKIP_DIR_NAMES = new Set([
  "node_modules",
  "dist",
  "build",
  "coverage",
  "out",
  "vendor",
  "target",
  "__pycache__",
]);

const TEST_DIR_NAMES = new Set(["tests", "test", "__tests__"]);

// .test./.spec. plus a JS/TS extension — covers the common JS, TS, and JSX/TSX variants.
const TEST_FILE_RE = /\.(test|spec)\.(ts|tsx|js|jsx|mjs|cjs)$/i;

const MAX_ENTRIES_SCANNED = 20000;
const MAX_DEPTH = 12;

/**
 * Scans baseDir for test evidence: a conventionally-named test directory at any depth,
 * or a colocated ".test." / ".spec." file at any depth.
 *
 * Returns { found: boolean, reason: string } — reason is always a specific, legible
 * sentence (what was found and where, or exactly what was checked and ruled out), so a
 * "no tests" result is an explicit, deterministic statement, not a bare zero.
 */
export function findTestEvidence(baseDir) {
  let entriesScanned = 0;
  let capped = false;

  function walk(dir, depth) {
    if (capped || depth > MAX_DEPTH) return null;
    let entries;
    try {
      entries = readdirSync(dir).sort();
    } catch {
      return null;
    }
    for (const name of entries) {
      if (entriesScanned >= MAX_ENTRIES_SCANNED) {
        capped = true;
        return null;
      }
      entriesScanned++;

      // Any dot-directory (.git, .next, .turbo, .cache, .vercel, .venv, and any
      // tool-specific runtime-state directory) is skipped by convention: none of these
      // legitimately hold source test files, and skipping them all by one rule is
      // simpler and safer than an incomplete
      // explicit list.
      if (name.startsWith(".")) continue;

      const full = join(dir, name);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }

      if (st.isDirectory()) {
        const lower = name.toLowerCase();
        if (SKIP_DIR_NAMES.has(lower)) continue;
        if (TEST_DIR_NAMES.has(lower)) {
          return { kind: "directory", path: full.slice(baseDir.length + 1) };
        }
        const nested = walk(full, depth + 1);
        if (nested) return nested;
      } else if (st.isFile() && TEST_FILE_RE.test(name)) {
        return { kind: "colocated-file", path: full.slice(baseDir.length + 1) };
      }
    }
    return null;
  }

  const result = walk(baseDir, 0);

  if (result) {
    const kindLabel = result.kind === "directory" ? "test directory" : "colocated test file";
    return { found: true, reason: `${kindLabel} found: ${result.path}` };
  }

  if (capped) {
    return {
      found: false,
      reason: `no test directory (tests/, test/, __tests__/, at any depth) or colocated *.test.*/*.spec.* file found in the first ${MAX_ENTRIES_SCANNED} entries scanned (scan capped — repository is larger than the bounded scan covers)`,
    };
  }

  return {
    found: false,
    reason: "no test directory (tests/, test/, __tests__/, at any depth) and no colocated *.test.*/*.spec.* file found anywhere in the repository",
  };
}
