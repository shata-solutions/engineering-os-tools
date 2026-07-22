// Case-insensitive filesystem path resolution.
//
// Root cause this exists to fix: check-repo-blueprint.mjs and engineering-score.mjs
// used to call Node's plain `existsSync(join(target, relPath))` for every rule. That is
// silently OS-dependent: APFS (macOS) and NTFS (Windows) are case-insensitive by
// default, so `existsSync(".../.github/PULL_REQUEST_TEMPLATE.md")` returns true even
// when the real file on disk is `.github/pull_request_template.md`. ext4 (the
// filesystem on virtually all Linux CI runners, including GitHub Actions'
// ubuntu-latest) is case-sensitive — the same check there returns false, a false
// negative that would only surface in CI, never locally on a Mac.
//
// Fix: never rely on the host filesystem's own case-folding. Every segment of the
// requested path is compared against real directory entries using an explicit
// lowercase string comparison in JS. This makes the result identical on every
// platform — it is not "case-insensitive because this happens to run on macOS," it is
// case-insensitive by construction, independent of the OS.
//
// Directory entries are sorted before matching so that a (pathological, extremely
// unlikely) repo with two case-variant files present at once — e.g. both `README.md`
// and `readme.md` on a case-sensitive filesystem — still resolves deterministically to
// the same one on every run, rather than depending on unspecified readdir ordering.

import { readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Resolves relPath under baseDir by matching each path segment case-insensitively.
 * Returns the real on-disk path (with its actual casing) if found, or null.
 */
export function resolveCaseInsensitive(baseDir, relPath) {
  const segments = relPath.split("/").filter(Boolean);
  let current = baseDir;
  for (const segment of segments) {
    let entries;
    try {
      entries = readdirSync(current).sort();
    } catch {
      return null;
    }
    const match = entries.find((entry) => entry.toLowerCase() === segment.toLowerCase());
    if (match === undefined) return null;
    current = join(current, match);
  }
  return current;
}

/** Case-insensitive existence check. See resolveCaseInsensitive for the full contract. */
export function existsCaseInsensitive(baseDir, relPath) {
  return resolveCaseInsensitive(baseDir, relPath) !== null;
}
