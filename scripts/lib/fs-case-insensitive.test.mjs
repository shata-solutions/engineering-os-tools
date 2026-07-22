// Regression tests for lib/fs-case-insensitive.mjs.
// Run: node --test scripts/lib/fs-case-insensitive.test.mjs
//
// These tests do not, and cannot, rely on the host OS actually being case-sensitive to
// prove the fix works (this development machine is macOS/APFS, which is
// case-insensitive by default — the same bug this file guards against would silently
// "pass" on a naive test written the wrong way). Instead, every "case mismatch" test
// below queries with a DIFFERENT casing than what's on disk and asserts the resolver
// still finds it via its own explicit lowercase comparison — proving the fix works by
// construction, not by coincidence of which machine ran the test.

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { existsCaseInsensitive, resolveCaseInsensitive } from "./fs-case-insensitive.mjs";

const tmpDirs = [];
function makeFixture() {
  const dir = mkdtempSync(join(tmpdir(), "eos-fsci-"));
  tmpDirs.push(dir);
  return dir;
}
after(() => {
  for (const d of tmpDirs) rmSync(d, { recursive: true, force: true });
});

test("exact-case match resolves", () => {
  const dir = makeFixture();
  mkdirSync(join(dir, ".github"));
  writeFileSync(join(dir, ".github", "pull_request_template.md"), "x");

  assert.equal(existsCaseInsensitive(dir, ".github/pull_request_template.md"), true);
});

test("regression: querying uppercase PULL_REQUEST_TEMPLATE.md finds a lowercase on-disk file", () => {
  // This is the exact bug this module exists to fix: a naive checker might hardcode
  // the uppercase path, while real repos commonly use the lowercase filename. This test
  // queries with the OLD (wrong) uppercase path against a fixture that only has the
  // lowercase file, and asserts it is still found — the fix must not depend on which
  // casing the code happens to query with.
  const dir = makeFixture();
  mkdirSync(join(dir, ".github"));
  writeFileSync(join(dir, ".github", "pull_request_template.md"), "x");

  assert.equal(existsCaseInsensitive(dir, ".github/PULL_REQUEST_TEMPLATE.md"), true);
});

test("regression: absence of .github is absence, not a false positive", () => {
  // Distinguishes "wrong casing" from "genuinely missing" — a fixture with NO .github
  // directory at all must resolve to false, in every casing queried.
  const dir = makeFixture();
  writeFileSync(join(dir, "README.md"), "x");

  assert.equal(existsCaseInsensitive(dir, ".github"), false);
  assert.equal(existsCaseInsensitive(dir, ".GITHUB"), false);
  assert.equal(existsCaseInsensitive(dir, ".github/pull_request_template.md"), false);
});

test("mixed/arbitrary casing in the query still resolves", () => {
  const dir = makeFixture();
  mkdirSync(join(dir, ".github"));
  writeFileSync(join(dir, ".github", "pull_request_template.md"), "x");

  assert.equal(existsCaseInsensitive(dir, ".GitHub/Pull_Request_Template.MD"), true);
});

test("nested path: every segment is matched independently", () => {
  const dir = makeFixture();
  mkdirSync(join(dir, "a", "B", "c"), { recursive: true });
  writeFileSync(join(dir, "a", "B", "c", "D.txt"), "x");

  assert.equal(existsCaseInsensitive(dir, "A/b/C/d.txt"), true);
  assert.equal(existsCaseInsensitive(dir, "A/b/C/d.TXT"), true);
  assert.equal(existsCaseInsensitive(dir, "A/wrong/C/d.txt"), false);
});

test("resolveCaseInsensitive returns the real on-disk path, not the queried one", () => {
  const dir = makeFixture();
  mkdirSync(join(dir, ".github"));
  writeFileSync(join(dir, ".github", "pull_request_template.md"), "x");

  const resolved = resolveCaseInsensitive(dir, ".github/PULL_REQUEST_TEMPLATE.md");
  assert.equal(resolved, join(dir, ".github", "pull_request_template.md"));
});

test("does not match a partial/prefix filename", () => {
  const dir = makeFixture();
  writeFileSync(join(dir, "README.md.bak"), "x");

  assert.equal(existsCaseInsensitive(dir, "README.md"), false);
});
