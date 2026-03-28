/**
 * Tests for shared job-hunter configuration utilities.
 *
 * matchesTargetRole() is used by the Python ingest.py script to filter jobs
 * for target roles (Director of Engineering, Senior Engineering Manager, VP of Engineering, VP of QA).
 *
 * Structure follows Given / When / Then thinking:
 *   Given: a job title and optional roles list
 *   When:  matchesTargetRole() is called
 *   Then:  the return value reflects whether the title matches a target role
 */

import { matchesTargetRole } from '../../job-hunter/config';

// ─── matchesTargetRole() ──────────────────────────────────────────────────────

describe('matchesTargetRole()', () => {
  it('returns true for an exact target role title', () => {
    expect(matchesTargetRole('VP of Engineering')).toBe(true);
  });

  it('returns true for a title that contains the target role', () => {
    expect(matchesTargetRole('Senior VP of Engineering')).toBe(true);
  });

  it('returns false for an unrelated title', () => {
    expect(matchesTargetRole('Software Engineer')).toBe(false);
  });

  it('matches target roles case-insensitively', () => {
    expect(matchesTargetRole('vp of engineering')).toBe(true);
  });

  it('returns false for an empty title', () => {
    expect(matchesTargetRole('')).toBe(false);
  });

  it('uses a provided roles list instead of the default', () => {
    expect(matchesTargetRole('Custom Role', ['Custom Role'])).toBe(true);
    expect(matchesTargetRole('VP of Engineering', ['Custom Role'])).toBe(false);
  });
});
