// Regression tests for lib/test-detection.mjs.
// Run: node --test scripts/lib/test-detection.test.mjs

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { findTestEvidence } from "./test-detection.mjs";

const tmpDirs = [];
function makeFixture() {
  const dir = mkdtempSync(join(tmpdir(), "eos-testdet-"));
  tmpDirs.push(dir);
  return dir;
}
after(() => {
  for (const d of tmpDirs) rmSync(d, { recursive: true, force: true });
});

test("colocated src/example.test.ts is found", () => {
  const dir = makeFixture();
  mkdirSync(join(dir, "src"));
  writeFileSync(join(dir, "src", "example.test.ts"), "x");

  const result = findTestEvidence(dir);
  assert.equal(result.found, true);
  assert.match(result.reason, /colocated test file found: src\/example\.test\.ts/);
});

test("colocated React src/example.spec.tsx is found", () => {
  const dir = makeFixture();
  mkdirSync(join(dir, "src"));
  writeFileSync(join(dir, "src", "example.spec.tsx"), "x");

  const result = findTestEvidence(dir);
  assert.equal(result.found, true);
  assert.match(result.reason, /colocated test file found: src\/example\.spec\.tsx/);
});

test("a dedicated tests/ directory is found (root level)", () => {
  const dir = makeFixture();
  mkdirSync(join(dir, "tests"));
  writeFileSync(join(dir, "tests", "foo.ts"), "x");

  const result = findTestEvidence(dir);
  assert.equal(result.found, true);
  assert.match(result.reason, /test directory found: tests/);
});

test("no tests at all: found is false with an explicit, specific reason", () => {
  const dir = makeFixture();
  mkdirSync(join(dir, "src"));
  writeFileSync(join(dir, "src", "index.ts"), "x");
  writeFileSync(join(dir, "README.md"), "x");

  const result = findTestEvidence(dir);
  assert.equal(result.found, false);
  assert.equal(typeof result.reason, "string");
  assert.ok(result.reason.length > 20, "reason should be a real explanation, not empty/terse");
  assert.match(result.reason, /no test directory/);
  assert.match(result.reason, /no colocated/);
});

test("ignored: node_modules, dist, build, coverage never count as test evidence", () => {
  const dir = makeFixture();
  mkdirSync(join(dir, "node_modules", "some-pkg"), { recursive: true });
  writeFileSync(join(dir, "node_modules", "some-pkg", "fake.test.js"), "x");
  mkdirSync(join(dir, "node_modules", "some-pkg", "test"), { recursive: true });

  mkdirSync(join(dir, "dist"), { recursive: true });
  writeFileSync(join(dir, "dist", "generated.test.js"), "x");

  mkdirSync(join(dir, "coverage"), { recursive: true });
  writeFileSync(join(dir, "coverage", "report.spec.js"), "x");

  mkdirSync(join(dir, ".next", "cache"), { recursive: true });
  writeFileSync(join(dir, ".next", "cache", "x.test.ts"), "x");

  const result = findTestEvidence(dir);
  assert.equal(result.found, false, `expected no test evidence, got: ${result.reason}`);
});

test("documentation that merely mentions a test filename is not a false positive", () => {
  const dir = makeFixture();
  mkdirSync(join(dir, "docs"));
  writeFileSync(
    join(dir, "docs", "CONTRIBUTING.md"),
    "Add a test at src/example.test.ts before opening a PR. See also foo.spec.tsx."
  );

  const result = findTestEvidence(dir);
  assert.equal(result.found, false, `file contents must never be matched, only real filenames: ${result.reason}`);
});

test("mixed layout: nested monorepo test/ directory two levels deep is found", () => {
  // A common real-world monorepo shape: packages/core/test/*.test.ts, no root-level
  // tests/ directory at all. A root-only check would miss this entirely.
  const dir = makeFixture();
  mkdirSync(join(dir, "packages", "core", "test"), { recursive: true });
  writeFileSync(join(dir, "packages", "core", "test", "protocol.test.ts"), "x");
  mkdirSync(join(dir, "packages", "adapters"), { recursive: true });
  writeFileSync(join(dir, "packages", "adapters", "contract.test.ts"), "x");

  const result = findTestEvidence(dir);
  assert.equal(result.found, true);
});

test("mixed layout: colocated file found even when a same-named non-test dir exists elsewhere", () => {
  const dir = makeFixture();
  // A directory literally named "testing" (not "test"/"tests"/"__tests__") must NOT
  // count as a dedicated test directory — only the exact conventional names do.
  mkdirSync(join(dir, "testing"));
  writeFileSync(join(dir, "testing", "notes.md"), "x");
  mkdirSync(join(dir, "src"));
  writeFileSync(join(dir, "src", "app.spec.ts"), "x");

  const result = findTestEvidence(dir);
  assert.equal(result.found, true);
  assert.match(result.reason, /colocated test file found: src\/app\.spec\.ts/);
});

test("a directory named 'testing' alone (no real test file) is correctly not found", () => {
  const dir = makeFixture();
  mkdirSync(join(dir, "testing"));
  writeFileSync(join(dir, "testing", "notes.md"), "x");

  const result = findTestEvidence(dir);
  assert.equal(result.found, false);
});

test("__tests__ directory nested under src/ is found", () => {
  const dir = makeFixture();
  mkdirSync(join(dir, "src", "__tests__"), { recursive: true });
  writeFileSync(join(dir, "src", "__tests__", "app.js"), "x");

  const result = findTestEvidence(dir);
  assert.equal(result.found, true);
  assert.match(result.reason, /test directory found: src\/__tests__/);
});
