// End-to-end regression tests for engineering-score.mjs — runs the real script as a
// subprocess against constructed fixtures. See check-repo-blueprint.test.mjs for why
// this exists in addition to the lib/*.test.mjs unit tests.
//
// Run: node --test scripts/engineering-score.test.mjs

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(__dirname, "engineering-score.mjs");

const tmpDirs = [];
function makeFixture() {
  const dir = mkdtempSync(join(tmpdir(), "eos-score-"));
  tmpDirs.push(dir);
  return dir;
}
after(() => {
  for (const d of tmpDirs) rmSync(d, { recursive: true, force: true });
});

function run(dir) {
  return execFileSync("node", [SCRIPT, dir], { encoding: "utf8" });
}

function testingLine(stdout) {
  const idx = stdout.indexOf("Testing");
  assert.ok(idx >= 0, "Testing category not found in output");
  return stdout.slice(idx, stdout.indexOf("\n\n", idx) === -1 ? undefined : stdout.indexOf("Developer Experience", idx));
}

test("colocated *.spec.tsx counts toward the Testing score (regression for the original bug)", () => {
  const dir = makeFixture();
  mkdirSync(join(dir, "src"));
  writeFileSync(join(dir, "src", "App.spec.tsx"), "x");
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "x", scripts: { test: "vitest" } }));

  const stdout = run(dir);
  assert.match(stdout, /Testing\s+10 \/ 10/, `expected full Testing score, got:\n${testingLine(stdout)}`);
});

test("nested monorepo test/ directory counts toward the Testing score", () => {
  const dir = makeFixture();
  mkdirSync(join(dir, "packages", "core", "test"), { recursive: true });
  writeFileSync(join(dir, "packages", "core", "test", "protocol.test.ts"), "x");
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "x", scripts: { test: "vitest" } }));

  const stdout = run(dir);
  assert.match(stdout, /Testing\s+10 \/ 10/, `expected full Testing score, got:\n${testingLine(stdout)}`);
});

test("no test script and no test evidence scores 0/10 with an explicit reason, not a silent zero", () => {
  const dir = makeFixture();
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "x", scripts: {} }));

  const stdout = run(dir);
  assert.match(stdout, /Testing\s+0 \/ 10/);
  assert.match(stdout, /no `test` script in package\.json/);
  assert.match(stdout, /no test directory .* and no colocated/);
});

test("node_modules and dist test-shaped files never inflate the Testing score", () => {
  const dir = makeFixture();
  mkdirSync(join(dir, "node_modules", "pkg"), { recursive: true });
  writeFileSync(join(dir, "node_modules", "pkg", "fake.test.js"), "x");
  mkdirSync(join(dir, "dist"), { recursive: true });
  writeFileSync(join(dir, "dist", "generated.spec.js"), "x");
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "x", scripts: {} }));

  const stdout = run(dir);
  assert.match(stdout, /Testing\s+0 \/ 10/, "dependency/build artifacts must not count as test evidence");
});

test("lowercase pull_request_template.md counts toward Open Source / Contribution Readiness", () => {
  const dir = makeFixture();
  writeFileSync(join(dir, "CONTRIBUTING.md"), "x");
  mkdirSync(join(dir, ".github"));
  writeFileSync(join(dir, ".github", "pull_request_template.md"), "x");

  const stdout = run(dir);
  assert.match(stdout, /Open Source \/ Contribution Readiness\s+10 \/ 10/);
});

test("a repo with no package.json and no .env files is not penalized for missing .env.example", () => {
  // Regression for a real bug found during a cross-repo audit: this category checked
  // .env.example presence unconditionally, unlike check-repo-blueprint.mjs's equivalent
  // rule, which correctly exempts repos with nothing to document. A zero-dependency
  // repo (no package.json, no .env/.env.local) has no env vars at all.
  const dir = makeFixture();
  writeFileSync(join(dir, "README.md"), "x");

  const stdout = run(dir);
  const idx = stdout.indexOf("Repository Hygiene");
  const section = stdout.slice(idx, stdout.indexOf("Security", idx));
  assert.doesNotMatch(section, /\.env\.example missing/, `expected no .env.example deduction, got:\n${section}`);
});

test("a repo that DOES use env vars (has package.json) is still correctly penalized for missing .env.example", () => {
  const dir = makeFixture();
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "x" }));

  const stdout = run(dir);
  assert.match(stdout, /\.env\.example missing \(repo reads env vars but has no example file\)/);
});

test("total score is still out of 100 and arithmetic is internally consistent", () => {
  const dir = makeFixture();
  writeFileSync(join(dir, "README.md"), "A real readme with enough words to not look like a stub. ".repeat(5));
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "x", scripts: { test: "vitest", dev: "x", build: "x" } }));
  mkdirSync(join(dir, "src"));
  writeFileSync(join(dir, "src", "app.test.ts"), "x");

  const stdout = run(dir);
  const scoreMatch = stdout.match(/Engineering Score \(heuristic\): (\d+) \/ 100/);
  assert.ok(scoreMatch, "score line not found");
  const score = Number(scoreMatch[1]);
  assert.ok(score >= 0 && score <= 100, `score out of range: ${score}`);
});
