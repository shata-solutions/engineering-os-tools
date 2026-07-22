// End-to-end regression tests for check-repo-blueprint.mjs — runs the real script as a
// subprocess against constructed fixtures, exactly as it would run in CI or from the
// command line. This is deliberately in addition to the lib/*.test.mjs unit tests: it
// proves the fix is actually wired into the script's rule table, not just correct in
// isolation.
//
// Run: node --test scripts/check-repo-blueprint.test.mjs

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(__dirname, "check-repo-blueprint.mjs");

const tmpDirs = [];
function makeFixture() {
  const dir = mkdtempSync(join(tmpdir(), "eos-blueprint-"));
  tmpDirs.push(dir);
  return dir;
}
after(() => {
  for (const d of tmpDirs) rmSync(d, { recursive: true, force: true });
});

function run(dir) {
  try {
    const stdout = execFileSync("node", [SCRIPT, dir], { encoding: "utf8" });
    return { stdout, exitCode: 0 };
  } catch (err) {
    // execFileSync throws on non-zero exit (expected for a non-compliant fixture) —
    // the real stdout/exit code are still on the error object.
    return { stdout: err.stdout ?? "", exitCode: err.status };
  }
}

function line(stdout, ruleId) {
  const match = stdout.split("\n").find((l) => l.includes(` ${ruleId} `) || l.trim().endsWith(ruleId));
  return match ?? null;
}

test("lowercase .github/pull_request_template.md passes the pr-template check", () => {
  const dir = makeFixture();
  mkdirSync(join(dir, ".github"));
  writeFileSync(join(dir, ".github", "pull_request_template.md"), "x");

  const { stdout } = run(dir);
  const l = line(stdout, "pr-template");
  assert.ok(l, "pr-template line not found in output");
  assert.match(l, /^\[PASS\]/, `expected PASS, got: ${l}`);
});

test("missing PR template (any casing) correctly warns, not a false pass", () => {
  const dir = makeFixture();
  mkdirSync(join(dir, ".github"));

  const { stdout } = run(dir);
  const l = line(stdout, "pr-template");
  assert.ok(l);
  assert.match(l, /^\[WARN\]/, `expected WARN, got: ${l}`);
});

test("colocated test file passes the tests-dir-or-script check", () => {
  const dir = makeFixture();
  mkdirSync(join(dir, "src"));
  writeFileSync(join(dir, "src", "app.test.ts"), "x");

  const { stdout } = run(dir);
  const l = line(stdout, "tests-dir-or-script");
  assert.ok(l);
  assert.match(l, /^\[PASS\]/, `expected PASS, got: ${l}`);
});

test("nested monorepo test/ directory passes the tests-dir-or-script check", () => {
  const dir = makeFixture();
  mkdirSync(join(dir, "packages", "core", "test"), { recursive: true });
  writeFileSync(join(dir, "packages", "core", "test", "foo.test.ts"), "x");

  const { stdout } = run(dir);
  const l = line(stdout, "tests-dir-or-script");
  assert.match(l, /^\[PASS\]/, `expected PASS, got: ${l}`);
});

test("a repo with genuinely no tests correctly warns", () => {
  const dir = makeFixture();
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "x", scripts: {} }));

  const { stdout } = run(dir);
  const l = line(stdout, "tests-dir-or-script");
  assert.match(l, /^\[WARN\]/, `expected WARN, got: ${l}`);
});

test("full-blueprint fixture is required-tier compliant (exit 0) and reports 0 required failures", () => {
  const dir = makeFixture();
  writeFileSync(join(dir, "README.md"), "A real readme with enough words to not look like a stub. ".repeat(5));
  writeFileSync(join(dir, "LICENSE"), "proprietary");
  writeFileSync(join(dir, "CHANGELOG.md"), "# Changelog");
  writeFileSync(join(dir, "CONTRIBUTING.md"), "# Contributing");
  writeFileSync(join(dir, "SECURITY.md"), "# Security");
  writeFileSync(join(dir, "ARCHITECTURE.md"), "# Architecture");
  writeFileSync(join(dir, "AI_ASSISTED_ENGINEERING.md"), "# AI");
  writeFileSync(join(dir, ".gitignore"), ".env*\n!.env.example\n");
  mkdirSync(join(dir, ".github"));
  writeFileSync(join(dir, ".github", "pull_request_template.md"), "x");

  const { stdout, exitCode } = run(dir);
  assert.equal(exitCode, 0, stdout);
  assert.match(stdout, /0 required failure\(s\)/);
});
